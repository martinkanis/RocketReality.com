import { revokeEarlyWithdrawnRewards } from '@rocket/core'
import { createLogger } from '../logger'
import { defineJob } from './define-job'

export const REWARD_GUARD_CRON = '*/10 * * * *'

const logger = createLogger('rewards.guard')

/**
 * Zamítá nevyplacené odměny za inzeráty, které zmizely z webu dřív než po
 * ochranné lhůtě. Běží jako cron, aby pokryl všechny cesty zmizení —
 * stažení inzerentem, zásah admina i smazání přes importní rozhraní.
 */
export const rewardGuardJob = defineJob({
  name: 'rewards.guard',
  handler: async () => {
    const revoked = await revokeEarlyWithdrawnRewards()
    for (const reward of revoked) {
      logger.info(
        { payoutId: reward.payoutId, listingId: reward.listingId },
        'Odměna zamítnuta — inzerát zmizel v ochranné lhůtě',
      )
    }
  },
})
