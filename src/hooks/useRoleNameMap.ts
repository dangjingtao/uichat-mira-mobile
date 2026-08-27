import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  buildRoleNameMap,
  roleApi,
  type RoleNameMap,
} from '../api/roleApi';
import { useHostStore } from '../store/hostStore';

const EMPTY_ROLE_NAMES: RoleNameMap = Object.freeze({});

/**
 * Role summaries are supplementary display metadata. A failed summary read must
 * not turn a valid Thread list into a false Thread error; callers fall back to
 * the existing type icon/title and never expose raw role ids.
 *
 * Refresh on screen focus and whenever Host connectivity changes while focused
 * so a transient launch/background outage does not leave role names stale until
 * the screen is remounted.
 */
export const useRoleNameMap = (): RoleNameMap => {
  const [roleNames, setRoleNames] = useState<RoleNameMap>(EMPTY_ROLE_NAMES);
  const connectionStatus = useHostStore((state) => state.connectionStatus);

  const load = useCallback(async () => {
    try {
      setRoleNames(buildRoleNameMap(await roleApi.listRoleSummaries()));
    } catch {
      setRoleNames(EMPTY_ROLE_NAMES);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [connectionStatus, load]),
  );

  return roleNames;
};
