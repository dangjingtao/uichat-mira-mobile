#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>

@interface MiraAudioRecorder : NSObject <RCTBridgeModule>
@property(nonatomic, strong) AVAudioRecorder *recorder;
@property(nonatomic, strong) NSURL *currentURL;
@property(nonatomic, assign) NSTimeInterval startedAtMs;
@end

@implementation MiraAudioRecorder

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    // Objective-C++ rejects a switch whose case contains a block capturing a
    // variable, because jumping to another label would skip the block's
    // lifetime. Keep the permission branch as an if-chain instead.
    AVAudioSession *session = [AVAudioSession sharedInstance];
    AVAudioSessionRecordPermission permission = session.recordPermission;
    if (permission == AVAudioSessionRecordPermissionGranted) {
      resolve(@"granted");
      return;
    }
    if (permission == AVAudioSessionRecordPermissionDenied) {
      resolve(@"blocked");
      return;
    }
    if (permission != AVAudioSessionRecordPermissionUndetermined) {
      resolve(@"unavailable");
      return;
    }
    [session requestRecordPermission:^(BOOL granted) {
      resolve(granted ? @"granted" : @"denied");
    }];
  });
}

RCT_EXPORT_METHOD(start:(NSString *)recordingId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.recorder != nil) {
      reject(@"RECORDING_ACTIVE", @"A recording is already active", nil);
      return;
    }

    NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:@"^[A-Za-z0-9_-]{1,80}$" options:0 error:nil];
    if ([regex numberOfMatchesInString:recordingId options:0 range:NSMakeRange(0, recordingId.length)] != 1) {
      reject(@"INVALID_RECORDING_ID", @"Recording id contains unsupported characters", nil);
      return;
    }

    AVAudioSession *session = [AVAudioSession sharedInstance];
    if (session.recordPermission != AVAudioSessionRecordPermissionGranted) {
      reject(@"MICROPHONE_PERMISSION_REQUIRED", @"Microphone permission is required", nil);
      return;
    }

    NSError *error = nil;
    NSURL *directory = [self recordingsDirectory:&error];
    if (directory == nil) {
      reject(@"RECORDING_DIRECTORY_FAILED", @"Unable to create the local recording directory", error);
      return;
    }
    NSURL *url = [directory URLByAppendingPathComponent:[recordingId stringByAppendingString:@".m4a"]];
    [[NSFileManager defaultManager] removeItemAtURL:url error:nil];

    if (![session setCategory:AVAudioSessionCategoryRecord
                         mode:AVAudioSessionModeDefault
                      options:AVAudioSessionCategoryOptionDuckOthers
                        error:&error] ||
        ![session setActive:YES error:&error]) {
      reject(@"AUDIO_SESSION_FAILED", @"Unable to activate the microphone audio session", error);
      return;
    }

    NSDictionary *settings = @{
      AVFormatIDKey: @(kAudioFormatMPEG4AAC),
      AVSampleRateKey: @44100,
      AVNumberOfChannelsKey: @1,
      AVEncoderBitRateKey: @128000,
      AVEncoderAudioQualityKey: @(AVAudioQualityHigh),
    };

    AVAudioRecorder *recorder = [[AVAudioRecorder alloc] initWithURL:url settings:settings error:&error];
    if (recorder == nil || ![recorder prepareToRecord] || ![recorder record]) {
      [session setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:nil];
      reject(@"RECORDING_START_FAILED", @"Unable to start audio recording", error);
      return;
    }

    self.recorder = recorder;
    self.currentURL = url;
    self.startedAtMs = [[NSDate date] timeIntervalSince1970] * 1000.0;
    resolve(@{
      @"path": url.path,
      @"startedAtMs": @(self.startedAtMs),
    });
  });
}

RCT_EXPORT_METHOD(pause:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.recorder == nil || !self.recorder.isRecording) {
      reject(@"NO_ACTIVE_RECORDING", @"There is no active recording", nil);
      return;
    }
    [self.recorder pause];
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(resume:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.recorder == nil) {
      reject(@"NO_PAUSED_RECORDING", @"There is no paused recording", nil);
      return;
    }
    if (![self.recorder record]) {
      reject(@"RECORDING_RESUME_FAILED", @"Unable to resume audio recording", nil);
      return;
    }
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.recorder == nil || self.currentURL == nil) {
      reject(@"NO_ACTIVE_RECORDING", @"There is no active recording", nil);
      return;
    }

    NSTimeInterval durationMs = self.recorder.currentTime * 1000.0;
    NSURL *url = self.currentURL;
    NSTimeInterval startedAtMs = self.startedAtMs;
    [self.recorder stop];

    NSError *error = nil;
    NSDictionary *attributes = [[NSFileManager defaultManager] attributesOfItemAtPath:url.path error:&error];
    NSNumber *size = attributes[NSFileSize];
    if (attributes == nil || size.longLongValue <= 0) {
      [self clearRecorderDeletingFile:YES];
      reject(@"RECORDING_STOP_FAILED", @"Recording completed without a readable local file", error);
      return;
    }

    NSTimeInterval endedAtMs = [[NSDate date] timeIntervalSince1970] * 1000.0;
    resolve(@{
      @"path": url.path,
      @"startedAtMs": @(startedAtMs),
      @"endedAtMs": @(endedAtMs),
      @"durationMs": @(MAX(0, durationMs)),
      @"fileSizeBytes": size,
    });
    [self clearRecorderDeletingFile:NO];
  });
}

RCT_EXPORT_METHOD(cancel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.recorder stop];
    [self clearRecorderDeletingFile:YES];
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(fileInfo:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSError *error = nil;
  NSURL *url = [self checkedRecordingURL:path error:&error];
  if (url == nil) {
    reject(@"INVALID_RECORDING_PATH", @"Unable to inspect local recording", error);
    return;
  }
  NSDictionary *attributes = [[NSFileManager defaultManager] attributesOfItemAtPath:url.path error:nil];
  NSNumber *size = attributes[NSFileSize] ?: @0;
  resolve(@{
    @"exists": @(attributes != nil),
    @"size": size,
  });
}

RCT_EXPORT_METHOD(deleteFile:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSError *error = nil;
  NSURL *url = [self checkedRecordingURL:path error:&error];
  if (url == nil) {
    reject(@"INVALID_RECORDING_PATH", @"Unable to delete local recording", error);
    return;
  }
  if ([[NSFileManager defaultManager] fileExistsAtPath:url.path] &&
      ![[NSFileManager defaultManager] removeItemAtURL:url error:&error]) {
    reject(@"RECORDING_DELETE_FAILED", @"Unable to delete local recording", error);
    return;
  }
  resolve(nil);
}

- (NSURL *)recordingsDirectory:(NSError **)error {
  NSURL *applicationSupport = [[[NSFileManager defaultManager] URLsForDirectory:NSApplicationSupportDirectory
                                                                      inDomains:NSUserDomainMask] firstObject];
  if (applicationSupport == nil) {
    return nil;
  }
  NSURL *directory = [applicationSupport URLByAppendingPathComponent:@"ShiyanRecordings" isDirectory:YES];
  if (![[NSFileManager defaultManager] createDirectoryAtURL:directory
                                withIntermediateDirectories:YES
                                                 attributes:nil
                                                      error:error]) {
    return nil;
  }
  return directory;
}

- (NSURL *)checkedRecordingURL:(NSString *)path error:(NSError **)error {
  NSURL *root = [self recordingsDirectory:error];
  if (root == nil) return nil;
  NSString *rootPath = [[root URLByStandardizingPath] path];
  NSString *candidate = [[[NSURL fileURLWithPath:path] URLByStandardizingPath] path];
  NSString *prefix = [rootPath stringByAppendingString:@"/"];
  if (![candidate hasPrefix:prefix]) {
    if (error != NULL) {
      *error = [NSError errorWithDomain:@"MiraAudioRecorder"
                                   code:1
                               userInfo:@{NSLocalizedDescriptionKey: @"Path is outside the Shiyan recording directory"}];
    }
    return nil;
  }
  return [NSURL fileURLWithPath:candidate];
}

- (void)clearRecorderDeletingFile:(BOOL)deleteFile {
  NSURL *url = self.currentURL;
  self.recorder = nil;
  self.currentURL = nil;
  self.startedAtMs = 0;
  if (deleteFile && url != nil) {
    [[NSFileManager defaultManager] removeItemAtURL:url error:nil];
  }
  [[AVAudioSession sharedInstance] setActive:NO
                                 withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation
                                       error:nil];
}

@end
