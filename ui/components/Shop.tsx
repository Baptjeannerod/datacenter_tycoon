/**
 * Upgrade shop: "Better tech. Harder choices."
 * Shows visible effects honestly (chips), never the family (good / trap / tradeoff)
 * and never the hidden bill (envDebtPerTick, delayed effects).
 */
import { useState } from 'react';
import { canBuy, resolveUpgrade, shopUpgrades, type GameState } from '../../engine';
import { CATEGORY_LABEL, effectChips, money } from '../format';
import { content } from '../useGame';
import { CategoryIcon, Icon } from './Icons';

export function Shop({ state, onBuy }: { state: GameState; onBuy: (id: string) => void }) {
  const [justBought, setJustBought] = useState<string | null>(null);
  const items = shopUpgrades(state, content).sort((a, b) => a.cost - b.cost);
  const owned = state.owned.map((id) => content.upgrades.find((u) => u.id === id)!).filter(Boolean);
  const bought = justBought ? content.upgrades.find((u) => u.id === justBought) : null;

  return (
    <section className="shop" aria-labelledby="shop-title">
      <header className="shop-head">
        <h2 id="shop-title" className="pixel">
          Better tech. Harder choices.
        </h2>
        <p className="muted">Every upgrade has a trade-off. Some hide a bill.</p>
      </header>

      {state.queue.length > 0 && <p className="shop-wait">Answer the open card first, then you can install upgrades.</p>}

      {bought && (
        <div className="bought" role="status">
          <strong>{bought.name} installed.</strong> {bought.whyItMatters}
          <button className="link" onClick={() => setJustBought(null)}>
            OK
          </button>
        </div>
      )}

      <div className="shop-row" role="list">
        {items.map((u) => {
          const r = resolveUpgrade(u, state.locationId);
          const chips = effectChips(r.effects);
          const affordable = canBuy(state, content, u.id);
          return (
            <article key={u.id} className="upgrade" role="listitem">
              <div className="upgrade-top">
                <span className="upgrade-icon">
                  <CategoryIcon category={u.category} />
                </span>
                <div>
                  <div className="eyebrow">{CATEGORY_LABEL[u.category]}</div>
                  <h3 className="pixel">{u.name}</h3>
                </div>
              </div>
              <p className="muted">{u.pitch}</p>
              {chips.length > 0 && (
                <ul className="chips">
                  {chips.map((c) => (
                    <li key={c.text} className={`chip ${c.tone}`}>
                      {c.text}
                    </li>
                  ))}
                </ul>
              )}
              {r.note && <p className="note">📍 {r.note}</p>}
              <button
                className={`btn ${affordable ? 'primary' : ''} wide`}
                disabled={!affordable}
                onClick={() => {
                  onBuy(u.id);
                  setJustBought(u.id);
                }}
              >
                {u.cost === 0 ? 'Install · free' : `Install · ${money(u.cost)}`} <Icon.arrow />
              </button>
            </article>
          );
        })}
      </div>

      {owned.length > 0 && (
        <div className="installed">
          <span className="eyebrow">Installed</span>
          <ul className="chips">
            {owned.map((u) => (
              <li key={u.id} className="chip owned">
                {u.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
