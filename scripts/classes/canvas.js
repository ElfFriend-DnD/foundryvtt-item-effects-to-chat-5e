import { ItemEffectsToChat5eActor } from './actor.js';

/**
 * Handles all the logic related to Canvas dropping of effects
 */
export class ItemEffectsToChat5eCanvas {

  static init() {
    Hooks.on('dropCanvasData', ItemEffectsToChat5eCanvas.handleCanvasDrop);
  }

  static async handleCanvasDrop(canvas, dropData) {
    if (dropData.type !== "ActiveEffect") {
      return true;
    }

    const gridSize = canvas.scene?.data.grid

    const dropLocation = {
      x: dropData.x - gridSize / 2,
      y: dropData.y - gridSize / 2,
      height: gridSize,
      width: gridSize
    };

    // Get the set of targeted tokens
    const targets = (canvas.tokens?.placeables ?? []).filter(token => {
      if (!token.visible) return false;
      return Number.between(token.center.x, dropLocation.x, dropLocation.x + dropLocation.width)
        && Number.between(token.center.y, dropLocation.y, dropLocation.y + dropLocation.height);
    })
      .filter(token => !!token.actor);

    if (!targets.length) {
      // was not dragged onto a token
      return true;
    }

    await ItemEffectsToChat5eCanvas.applyEffectsToTokens(dropData.sceneId, targets.map(target => target.id), [dropData.effectUuid]);

    return true;
  }

  /**
   * Takes in a set of tokenIds and an effect uuid to apply to the given tokens.
   * 
   * @param {string} sceneId - The scene the tokens are on
   * @param {string[]} tokenIds - Array of token ids being targeted
   * @param {ActiveEffect} effectUuid - Active effect Uuid source to copy
   * @returns {Promise<boolean>} - A promise which resolves if completed successfully
   */
  static async applyEffectsToTokens(sceneId, tokenIds, effectUuids) {
    if (!sceneId || !tokenIds.length || !effectUuids.length) {
      throw new Error('Unable to apply effect to tokens, missing required information');
    }

    const targetTokens = tokenIds
      .map(targetTokenId => game.scenes.get(sceneId).tokens?.get(targetTokenId))
      .filter(token => !!token?.actor);

    if (!targetTokens.length) {
      ui.notifications.error('There was an error applying the effect, the target might no longer exist.')
      return false;
    }

    for (const targetToken of targetTokens) {
      await ItemEffectsToChat5eActor.applyEffectToActor(targetToken.actor, effectUuids);
    }
    return true;
  }
}
