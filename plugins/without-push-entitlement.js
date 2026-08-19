const {withEntitlementsPlist} = require('expo/config-plugins');

/**
 * Strips `aps-environment` from the iOS entitlements.
 *
 * `expo-notifications` adds the push entitlement unconditionally, but a free Apple ID
 * signs under a "Personal Team", and Apple does not grant the push capability to one —
 * so the build fails at signing rather than at runtime.
 *
 * Nothing here uses remote push. `src/infra/cues/sources.ts` is waiting on a *local*
 * notification (N1/N2), which needs no entitlement, and no push token is ever requested.
 * Removing it therefore costs nothing today.
 *
 * Delete this plugin if the project moves to a paid team and wants real push.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, cfg => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
