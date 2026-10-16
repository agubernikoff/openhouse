/**
 * Sign-up verification strategies (plan §4.3.1). Each returns the role a new
 * sign-up starts with. Launch is manual-only; a future strategy (e.g. matching
 * a client-provided allowlist of store numbers) is a new entry here selected
 * by `portal.verification`.
 *
 * @typedef {{
 *   portal: import('~/lib/portals').Portal;
 *   customerId: string;
 *   submission: Record<string, string>;
 *   context: any;
 * }} VerifyArgs
 * @typedef {{role: 'member' | 'pending'; reason: string}} VerifyResult
 */

/** @type {Record<string, (args: VerifyArgs) => Promise<VerifyResult>>} */
const STRATEGIES = {
  manual: async () => ({role: 'pending', reason: 'Needs manual review'}),
};

/**
 * Never auto-rejects: an unknown strategy, a non-match or an error all fall
 * back to `pending` so a legitimate franchisee is never locked out.
 * @param {VerifyArgs} args
 * @return {Promise<VerifyResult>}
 */
export async function verifySignup(args) {
  const strategy = STRATEGIES[args.portal.verification];
  if (!strategy) {
    return {role: 'pending', reason: 'Needs manual review'};
  }

  try {
    const result = await strategy(args);
    return result.role === 'member'
      ? result
      : {role: 'pending', reason: result.reason};
  } catch (error) {
    console.error('Portal sign-up verification failed:', error);
    return {
      role: 'pending',
      reason: 'Needs manual review (verification error)',
    };
  }
}
