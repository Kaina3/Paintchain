import type { GameMode } from '../../domain/entities.js';
import type { GameModeHandler } from '../../domain/gameMode.js';
import { NormalModeHandler } from './normalMode.js';
import { AnimationModeHandler } from './animationMode.js';
import { ShiritoriModeHandler } from './shiritoriMode.js';
import { QuizModeHandler } from './quizMode.js';
import { WerewolfModeHandler } from './werewolfMode.js';

const handlers: Record<GameMode, GameModeHandler> = {
  normal: new NormalModeHandler(),
  animation: new AnimationModeHandler(),
  shiritori: new ShiritoriModeHandler(),
  quiz: new QuizModeHandler(),
  werewolf: new WerewolfModeHandler(),
};

export function getGameModeHandler(mode: GameMode): GameModeHandler {
  return handlers[mode] ?? handlers.normal;
}
