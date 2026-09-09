import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SHARE_CARD_WIDTH, ShareCardView } from './ShareCardView';
import type { ShareCardModel } from './shareCardModel';

interface CaptureRequest {
  model: ShareCardModel;
  resolve: (uri: string) => void;
  reject: (error: Error) => void;
  timeoutMs: number;
}

const DEFAULT_CAPTURE_TIMEOUT_MS = 10_000;
/** Header and footer logo each fire onLogoLoad once. */
const EXPECTED_LOGO_LOADS = 2;

let activeRequest: CaptureRequest | null = null;
let notifyRoot: (() => void) | null = null;

export interface ShareCardCaptureOptions {
  timeoutMs?: number;
}

/**
 * Render the branded share card off-screen and rasterize it to a PNG file.
 * The card must stay mounted until layout and the logo decode both finish,
 * otherwise the capture can come back blank (known view-shot pitfall).
 */
export function requestShareCardCapture(
  model: ShareCardModel,
  options: ShareCardCaptureOptions = {},
): Promise<string> {
  if (activeRequest) {
    return Promise.reject(new Error('A share image capture is already in progress'));
  }
  if (!notifyRoot) {
    return Promise.reject(new Error('Share capture root is not mounted'));
  }
  return new Promise<string>((resolve, reject) => {
    activeRequest = {
      model,
      resolve,
      reject,
      timeoutMs: options.timeoutMs ?? DEFAULT_CAPTURE_TIMEOUT_MS,
    };
    notifyRoot?.();
  });
}

export function ShareCardCaptureRoot() {
  const [request, setRequest] = useState<CaptureRequest | null>(null);
  const cardRef = useRef<View>(null);
  const layoutDoneRef = useRef(false);
  const logoLoadsRef = useRef(0);
  const settledRef = useRef(false);

  useEffect(() => {
    notifyRoot = () => setRequest(activeRequest);
    return () => {
      notifyRoot = null;
      const pending = activeRequest;
      activeRequest = null;
      pending?.reject(new Error('Share capture root was unmounted'));
    };
  }, []);

  const settle = useCallback((outcome: { uri: string } | { error: Error }) => {
    const current = activeRequest;
    if (!current || settledRef.current) return;
    settledRef.current = true;
    activeRequest = null;
    setRequest(null);
    layoutDoneRef.current = false;
    logoLoadsRef.current = 0;
    if ('uri' in outcome) current.resolve(outcome.uri);
    else current.reject(outcome.error);
  }, []);

  useEffect(() => {
    if (!request) return undefined;
    settledRef.current = false;
    const timeout = setTimeout(() => {
      settle({ error: new Error('Share image capture timed out') });
    }, request.timeoutMs);
    return () => clearTimeout(timeout);
  }, [request, settle]);

  const maybeCapture = useCallback(async () => {
    if (!request || settledRef.current) return;
    if (!layoutDoneRef.current || logoLoadsRef.current < EXPECTED_LOGO_LOADS) return;
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        result: 'tmpfile',
        fileName: 'mira-share-card',
      });
      settle({ uri });
    } catch (error) {
      settle({
        error: error instanceof Error ? error : new Error('Share image capture failed'),
      });
    }
  }, [request, settle]);

  if (!request) return null;

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <View
        ref={cardRef}
        onLayout={() => {
          layoutDoneRef.current = true;
          void maybeCapture();
        }}
      >
        <ShareCardView
          model={request.model}
          onLogoLoad={() => {
            logoLoadsRef.current += 1;
            void maybeCapture();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Off-screen but still mounted and measured: view-shot rasterizes the view
  // itself, so it must neither be unmounted nor collapsed to zero size.
  hidden: {
    position: 'absolute',
    top: -10000,
    left: 0,
    width: SHARE_CARD_WIDTH,
  },
});
