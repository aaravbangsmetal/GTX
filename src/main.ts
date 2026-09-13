import './style.css';
import { Game } from './core/Game';
import { logger } from './shared/logger';

async function bootstrap(): Promise<void> {
  const game = new Game();
  await game.init();
  window.addEventListener('beforeunload', () => game.destroy());
}

bootstrap().catch((error) => {
  logger.error('main', 'Failed to start GTX', error);
});
