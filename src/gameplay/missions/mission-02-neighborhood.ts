import type { GameContext, MissionDefinition } from '../types';

export const MISSION_02: MissionDefinition = {
  id: 'mission-02-neighborhood',
  title: 'Neighborhood Watch',
  description: 'Some punks are causing trouble in Little Havana. Take care of them.',
  type: 'elimination',
  reward: 1000,
  prerequisites: ['mission-01-welcome'],
  objectives: [
    {
      id: 'go-havana',
      description: 'Go to Little Havana',
      type: 'reach',
      position: { x: -400, y: 2, z: 50 },
      radius: 30,
      completed: false,
    },
    {
      id: 'kill-hostiles',
      description: 'Eliminate 3 hostiles',
      type: 'kill',
      target: 'hostile',
      count: 3,
      completed: false,
    },
  ],
  onStart: (ctx: GameContext) => {
    ctx.events.emit('ui:notification', {
      text: 'Hostiles spotted in Little Havana',
      type: 'warning',
      duration: 4,
    });
  },
};
