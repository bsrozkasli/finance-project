import {describe, expectTypeOf, it} from 'vitest';
import type {AgentAnalysis, AgentDecisionStatus} from './useAgentAnalysis';
import type {WatchlistResearchStatus} from '../api/watchlists';

describe('AgentAnalysis types', () => {
    it('keeps decision and confidence nullable and reuses the shared status type', () => {
        expectTypeOf<AgentAnalysis['decision']>().toEqualTypeOf<string | null>();
        expectTypeOf<AgentAnalysis['confidence']>().toEqualTypeOf<number | null>();
        expectTypeOf<AgentDecisionStatus['status']>().toEqualTypeOf<WatchlistResearchStatus | null>();
        expectTypeOf<AgentAnalysis['decision_status']>().toEqualTypeOf<AgentDecisionStatus | null | undefined>();
    });
});
