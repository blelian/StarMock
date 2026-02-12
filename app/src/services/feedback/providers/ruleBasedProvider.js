import { evaluateResponse as evaluateRuleBasedResponse } from '../../feedbackService.js'

const PROVIDER_ID = 'rule_based'

/**
 * Rule-based feedback provider.
 * This wraps the existing STAR keyword evaluator behind a provider contract.
 */
export const ruleBasedFeedbackProvider = {
  id: PROVIDER_ID,
  evaluate: async ({ responseText, question }) =>
    evaluateRuleBasedResponse(responseText, question),
}

export default ruleBasedFeedbackProvider
