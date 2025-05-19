export interface FindCompositionsConfig {
  minNumCompositions: number;
  maxNumberRange: number;
  operation: 'Addition';
  requiredCorrectAnswersMinimumPercent: number;
}

export interface VerticalOperationsConfig {
  numOperations: number;
  maxNumberRange: number;
  operationsAllowed: 'Addition';
  requiredCorrectAnswersMinimumPercent: number;
}

export interface MultiStepProblemConfig {
  numQuestions: number;
  maxNumberRange: number;
  numSteps: number;
  operationsAllowed: 'Addition';
  requiredCorrectAnswersMinimumPercent: number;
}





