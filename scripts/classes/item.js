import { ItemEffectsToChat5e } from '../item-effects-to-chat-5e.js'

/**
 * Handles all the logic related to Item usage and the display of its effects
 */
export class ItemEffectsToChat5eItem {
  constructor(item, actor) {
    this.item = item;
    this.actor = actor;
  }

  /**
   * Register Hooks
   */
  static init() {
    Hooks.on('Item5e.roll', ItemEffectsToChat5eItem.handleItemRoll);
  }

  /**
   * When an item is rolled create a card for the GM to easily apply Targeted Effects
   * @param {*} item 
   * @returns 
   */
  static handleItemRoll = async (item) => {
    if (!item.effects.size) {
      return;
    }
    const actor = item.parent;

    if (!(actor instanceof Actor)) {
      return;
    }

    const easyEffectsItem = new ItemEffectsToChat5eItem(item, actor);

    easyEffectsItem.createListChatCard()
  }

  /**
   * When an item is rolled which has temporary effects, create a chat card
   * for the GM only which allows them to see all effects from that item
   * as well as all the tokens the caster targeted (if any).
   * 
   * @see ItemEffectsToChat5eChat - for where the chat event listeners are registered
   */
  async createListChatCard() {
    const temporaryEffects = this.item.effects.filter(effect => effect.isTemporary);

    if (!temporaryEffects.length) {
      return;
    }

    const targetedTokens = [...(game.user.targets?.values() ?? [])].filter(t => !!t.actor);

    const html = await renderTemplate(
      `modules/${ItemEffectsToChat5e.MODULE_NAME}/templates/item-effects-to-chat-card.hbs`,
      {
        targetedTokens,
        effects: this.item.effects,
        isGM: game.user.isGM
      });

    ItemEffectsToChat5e.log('Creating Card:', {
      effects: this.item.effects,
      targetedTokens,
      html
    });

    const messageData = {
      whisper: ChatMessage.getWhisperRecipients('gm'),
      blind: true,
      user: game.user.data._id,
      flags: {
        core: {
          canPopout: true
        },
        [ItemEffectsToChat5e.MODULE_NAME]: {
          isEffectListCard: true,
          sourceActor: {
            actorId: this.actor.id,
            sceneId: canvas.scene?.id,
            tokenId: this.actor.isToken ? this.actor.token.id : null,
          },
          targetedTokenIds: targetedTokens.map(token => token.id),
          effectUuids: this.item.effects.map(effect => effect.uuid),
        }
      },
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      speaker: ChatMessage.getSpeaker({actor: this.item.actor}),
      flavor: game.i18n.localize(`${ItemEffectsToChat5e.MODULE_NAME}.MESSAGE_HEADER`),
      content: html,
    }

    ChatMessage.create(messageData);
  };

}
