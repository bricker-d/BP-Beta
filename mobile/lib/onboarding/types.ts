import type { IntakeProfile } from '../types';

// Shared props passed to every step component
export interface StepProps {
  step: number;
  totalSteps: number;
  profile: Partial<IntakeProfile>;
  update: (data: Partial<IntakeProfile>) => void;
  next: () => void;
  back: () => void;
}
