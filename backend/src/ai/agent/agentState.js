/**
 * Agent State Machine
 * Strictly governs internal state transitions in the clinical agent orchestration lifecycle.
 */
const AGENT_STATES = {
  INITIALIZING: 'INITIALIZING',
  PLANNING: 'PLANNING',
  WAITING_FOR_TOOL: 'WAITING_FOR_TOOL',
  EXECUTING_TOOL: 'EXECUTING_TOOL',
  EVALUATING_RESULT: 'EVALUATING_RESULT',
  FINALIZING: 'FINALIZING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  LIMIT_REACHED: 'LIMIT_REACHED',
};

const ALLOWED_TRANSITIONS = {
  [AGENT_STATES.INITIALIZING]: [AGENT_STATES.PLANNING, AGENT_STATES.FAILED],
  [AGENT_STATES.PLANNING]: [
    AGENT_STATES.WAITING_FOR_TOOL,
    AGENT_STATES.FINALIZING,
    AGENT_STATES.COMPLETED,
    AGENT_STATES.LIMIT_REACHED,
    AGENT_STATES.FAILED,
  ],
  [AGENT_STATES.WAITING_FOR_TOOL]: [AGENT_STATES.EXECUTING_TOOL, AGENT_STATES.FAILED],
  [AGENT_STATES.EXECUTING_TOOL]: [AGENT_STATES.EVALUATING_RESULT, AGENT_STATES.FAILED],
  [AGENT_STATES.EVALUATING_RESULT]: [
    AGENT_STATES.PLANNING,
    AGENT_STATES.FINALIZING,
    AGENT_STATES.COMPLETED,
    AGENT_STATES.LIMIT_REACHED,
    AGENT_STATES.FAILED,
  ],
  [AGENT_STATES.FINALIZING]: [AGENT_STATES.COMPLETED, AGENT_STATES.FAILED],
  [AGENT_STATES.LIMIT_REACHED]: [AGENT_STATES.FINALIZING, AGENT_STATES.COMPLETED, AGENT_STATES.FAILED],
  [AGENT_STATES.COMPLETED]: [],
  [AGENT_STATES.FAILED]: [],
};

class AgentStateMachine {
  constructor(initialState = AGENT_STATES.INITIALIZING) {
    this.currentState = initialState;
    this.history = [{ state: initialState, timestamp: Date.now() }];
  }

  getState() {
    return this.currentState;
  }

  isTerminal() {
    return this.currentState === AGENT_STATES.COMPLETED || this.currentState === AGENT_STATES.FAILED;
  }

  transitionTo(nextState, context = {}) {
    const validTargets = ALLOWED_TRANSITIONS[this.currentState] || [];
    if (!validTargets.includes(nextState)) {
      throw new Error(
        `Invalid agent state transition from '${this.currentState}' to '${nextState}'`
      );
    }

    this.currentState = nextState;
    this.history.push({
      state: nextState,
      timestamp: Date.now(),
      ...context,
    });
    return this.currentState;
  }
}

module.exports = {
  AGENT_STATES,
  ALLOWED_TRANSITIONS,
  AgentStateMachine,
};
