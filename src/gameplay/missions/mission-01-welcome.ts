import type { MissionDefinition } from '../types';

export const MISSION_01: MissionDefinition = {
  id: 'mission-01-welcome',
  title: 'Welcome to Vice City',
  description: 'Get behind the wheel and drive to Downtown.',
  type: 'goto',
  reward: 500,
  prerequisites: [],
  objectives: [
    {
      id: 'enter-vehicle',
      description: 'Enter a vehicle',
      type: 'reach',
      completed: false,
    },
    {
      id: 'drive-downtown',
      description: 'Drive to the Downtown marker',
      type: 'reach',
      position: { x: -50, y: 2, z: 100 },
      radius: 20,
      completed: false,
    },
  ],
};
