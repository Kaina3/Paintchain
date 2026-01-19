import { motion } from 'framer-motion';
import { useWerewolfStore } from '../store/werewolfStore';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';

export function WerewolfResult() {
  const { result } = useWerewolfStore();

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-2xl animate-pulse text-white">結果を集計中...</div>
      </div>
    );
  }

  const werewolfPlayers = result.players.filter((p) => result.werewolves.includes(p.id));
  const villagerWin = result.caught;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white overflow-y-auto">
      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center pt-4"
      >
        <div className="text-5xl font-bold mb-2">
          {villagerWin ? '🎉 村人の勝利！' : '🐺 人狼の勝利！'}
        </div>
        {result.wolfGuessedPrompt && (
          <div className="text-lg text-yellow-400">
            ✨ 人狼がお題を当てました！ボーナス獲得！
          </div>
        )}
      </motion.div>

      {/* 人狼は誰だったか */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8 rounded-2xl bg-gray-800 p-6 text-center max-w-2xl mx-auto"
      >
        <div className="mb-4 text-lg text-gray-400">人狼は...</div>
        <div className="flex justify-center gap-6">
          {werewolfPlayers.map((player) => (
            <div key={player.id} className="text-center">
              <div
                className="mx-auto mb-2 h-16 w-16 rounded-full shadow-lg"
                style={{ backgroundColor: player.color }}
              />
              <div className="text-xl font-bold">{player.name}</div>
              <div className="text-red-400">🐺</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* お題の違い */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto"
      >
        <div className="rounded-xl bg-blue-900/50 p-4 text-center">
          <div className="mb-2 text-sm text-blue-300">村人のお題</div>
          <div className="text-2xl font-bold">{result.villagerPrompt}</div>
        </div>
        <div className="rounded-xl bg-red-900/50 p-4 text-center">
          <div className="mb-2 text-sm text-red-300">人狼のお題</div>
          <div className="text-2xl font-bold">
            {result.werewolfPrompt ?? '（なし）'}
          </div>
        </div>
      </motion.div>

      {/* 投票結果 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mb-8 max-w-2xl mx-auto"
      >
        <h3 className="mb-4 text-lg font-bold text-center">📊 投票結果</h3>
        <div className="space-y-2">
          {result.voteResults.map(({ playerId, voteCount }) => {
            const player = result.players.find((p) => p.id === playerId);
            const isWerewolf = result.werewolves.includes(playerId);
            const maxVotes = Math.max(...result.voteResults.map((v) => v.voteCount));
            const isTopVoted = voteCount === maxVotes;

            return (
              <div
                key={playerId}
                className={`flex items-center justify-between rounded-lg p-3 ${
                  isWerewolf
                    ? 'bg-red-900/30 border border-red-700'
                    : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: player?.color }}
                  />
                  <span className="font-medium">{player?.name}</span>
                  {isWerewolf && <span className="text-red-400">🐺</span>}
                  {isTopVoted && <span className="text-yellow-400">👈</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-gray-600 rounded-full w-24 overflow-hidden">
                    <div
                      className={`h-full ${isWerewolf ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{
                        width: `${maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="font-bold w-12 text-right">{voteCount} 票</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* スコアボード */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mb-8 max-w-2xl mx-auto"
      >
        <h3 className="mb-4 text-lg font-bold text-center">🏆 スコア</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.players
            .sort((a, b) => (result.scores[b.id] ?? 0) - (result.scores[a.id] ?? 0))
            .map((player, index) => {
              const isWerewolf = result.werewolves.includes(player.id);
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  className={`rounded-lg p-3 text-center ${
                    index === 0 ? 'bg-yellow-600/30 ring-2 ring-yellow-500' : 'bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-sm font-medium">{player.name}</span>
                    {isWerewolf && <span className="text-xs">🐺</span>}
                  </div>
                  <div className="text-3xl font-bold">{result.scores[player.id] ?? 0}</div>
                  {index === 0 && <div className="text-xs text-yellow-400">1位</div>}
                </motion.div>
              );
            })}
        </div>
      </motion.div>

      {/* 絵のギャラリー */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mb-8 max-w-4xl mx-auto"
      >
        <h3 className="mb-4 text-lg font-bold text-center">🎨 みんなの絵</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {result.drawings.map(({ playerId, entries }) => {
            const player = result.players.find((p) => p.id === playerId);
            const isWerewolf = result.werewolves.includes(playerId);
            return (
              <div key={playerId} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: player?.color }}
                  />
                  <span className="text-sm">{player?.name}</span>
                  {isWerewolf && <span className="text-xs text-red-400">🐺</span>}
                </div>
                <div className="space-y-2">
                  {entries.map((entry, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={entry.imageData}
                        alt={`${player?.name} R${entry.round}`}
                        className="w-full rounded-lg bg-white shadow"
                      />
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                        R{entry.round}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ロビーに戻るボタン */}
      <div className="text-center pb-8">
        <ReturnToLobbyButton />
      </div>
    </div>
  );
}
