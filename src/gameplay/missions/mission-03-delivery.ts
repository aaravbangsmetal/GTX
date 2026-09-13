import type { MissionDefinition } from '../types';

export const MISSION_03: MissionDefinition = {
  id: 'mission-03-delivery',
  title: 'Express Delivery',
  description: 'Pick up a package at the docks and deliver it to Starfish Island. You have 3 minutes.',
  type: 'delivery',
  reward: 2000,
  prerequisites: ['mission-02-neighborhood'],
  objectives: [
    {
      id: 'pickup-package',
      description: 'Pick up the package at Vice Port',
      type: 'collect',
      target: 'package',
      position: { x: -300, y: 2, z: -400 },
      radius: 5,
      count: 1,
      completed: false,
    },
    {
      id: 'deliver-package',
      description: 'Deliver to Starfish Island',
      type: 'deliver',
      position: { x: 100, y: 2, z: 600 },
      radius: 10,
      timeLimit: 180,
      completed: false,
    },
  ],
};
