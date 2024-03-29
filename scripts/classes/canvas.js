import { ItemEffectsToChat5e } from '../item-effects-to-chat-5e.js';

/**
 * Handles all the logic related to Canvas dropping of effects
 */
export class ItemEffectsToChat5eCanvas {

  static init() {
    Hooks.on('dropCanvasData', ItemEffectsToChat5eCanvas.handleCanvasDrop);
  }

  /**
   * Handles dropping an Active Effect on a canvas token
   * @param {*} canvas 
   * @param {*} dropData 
   * @returns 
   */
  static async handleCanvasDrop(canvas, dropData) {
    if (dropData.type !== "ActiveEffect") {
      return true;
    }

    // Get the set of targeted tokens
    const target = (canvas.tokens?.placeables ?? []).filter(token => {
      if (!token.visible) return false;

      // take token width/height multipliers into account when calculating drop area for this token
      const dropLocation = {
        x: dropData.x - token.hitArea.height / 2,
        y: dropData.y - token.hitArea.width / 2,
        height: token.hitArea.height,
        width: token.hitArea.width,
      };

      return Number.between(token.center.x, dropLocation.x, dropLocation.x + dropLocation.width)
        && Number.between(token.center.y, dropLocation.y, dropLocation.y + dropLocation.height);
    })
      .filter(token => !!token.actor)
      .pop(); // only want to drag this onto one token at a time

    if (!target) {
      // was not dragged onto a token
      return true;
    }

    await ItemEffectsToChat5eCanvas.applyEffectsToTokens(canvas.scene.id, [target.id], [dropData.data]);

    return true;
  }

  /**
   * Takes in a set of tokenIds and effect datas to apply to the given tokens.
   * Leverages `Token.toggleEffect` to accomplish this
   * 
   * @param {string} sceneId - The scene the tokens are on
   * @param {string[]} tokenIds - Array of token ids being targeted
   * @param {ActiveEffect[]} effectDatas - Array of Active effect dropDatas
   * @returns {Promise<boolean>} - A promise which resolves if completed successfully
   */
  static async applyEffectsToTokens(sceneId, tokenIds, effectDatas) {
    if (!sceneId || !tokenIds.length || !effectDatas.length) {
      throw new Error('Unable to apply effect to tokens, missing required information');
    }

    const targetTokens = tokenIds
      .map(targetTokenId => game.scenes.get(sceneId).tokens?.get(targetTokenId))
      .filter(token => !!token?.actor)
      .map(targetTokenDocument => targetTokenDocument.object);

    if (!targetTokens.length) {
      ui.notifications.error('There was an error applying the effect, the target might no longer exist.')
      return false;
    }

    for (const targetToken of targetTokens) {
      for (const effectData of effectDatas) {
        ItemEffectsToChat5e.log('applyEffectsToTokens', targetToken, effectData);

        await targetToken.toggleEffect({
          ...effectData,
        }, { active: true });
      }
    }
    return true;
  }
}

