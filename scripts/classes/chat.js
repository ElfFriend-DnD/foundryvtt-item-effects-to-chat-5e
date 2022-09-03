import { ItemEffectsToChat5e } from '../item-effects-to-chat-5e.js'
import { ItemEffectsToChat5eCanvas } from './canvas.js';

/**
 * Handles user interactions with created chat cards.
 *
 * Most of this class is adapted directly from Core's handling of Combatants
 * in the combat tracker.
 */
export class ItemEffectsToChat5eChat {
  _highlighted = null;

  /**
   * Set up listeners for the chat log and remove individual messages that should be hidden
   */
  static init() {
    Hooks.on('renderChatLog', (_chatLog, html) => this._registerChatListeners(html));

    Hooks.on('renderChatMessage', this.handleRenderChatMessage);

    Hooks.on('renderChatPopout', (app, html) => {
      if (app.message?.getFlag(ItemEffectsToChat5e.MODULE_NAME, isEffectListCard)) {
        this._registerChatListeners(html);
      }
    })
  }


  /**
   * Register the chatLog-wide event listeners to handle hovering over names and dragging effects.
   * Also used for chat popouts
   */
  static _registerChatListeners = (html) => {
    html.on('mouseenter', '.item-effects-to-chat-combatant-list > li', this._onCombatantHoverIn);
    html.on('mouseleave', '.item-effects-to-chat-combatant-list > li', this._onCombatantHoverOut);
    html.on('click', '.item-effects-to-chat-combatant-list > li', this._onCombatantMouseDown);

    html.on('click', '.item-effects-to-chat-card button', this._onClickApply);
  }

  /**
   * Adapted directly from Core's handling of Combatants in the combat tracker.
   * Allows actors hovered in chat to highlight on canvas.
   */
  static _onCombatantHoverIn = (event) => {
    event.preventDefault();

    if (!canvas.ready) return;
    const li = event.currentTarget;
    const token = canvas.tokens.get(li.dataset.tokenId);
    if (token?.isVisible) {
      if (!token._controlled) token._onHoverIn(event);
      this._highlighted = token;
    }
  }

  /**
   * Adapted directly from Core's handling of Combatants in the combat tracker.
   * Allows actors hovered in chat to highlight on canvas.
   */
  static _onCombatantHoverOut = (event) => {
    event.preventDefault();
    if (!canvas.ready) return;

    if (this._highlighted) this._highlighted._onHoverOut(event);
    this._highlighted = null;
  }

  /**
   * Adapted directly from Core's handling of Combatants in the combat tracker.
   * Allows actors hovered in chat to highlight on canvas.
   */
  static _onCombatantMouseDown = async (event) => {
    event.preventDefault();

    const li = event.currentTarget;
    const token = canvas.tokens.get(li.dataset.tokenId);
    if (!token?.actor?.testUserPermission(game.user, "OBSERVED")) return;
    const now = Date.now();

    // Handle double-left click to open sheet
    const dt = now - this._clickTime;
    this._clickTime = now;
    if (dt <= 250) {
      if (token.actor) token.actor.sheet.render(true);
    }

    if (!canvas.ready) return;

    // Control and pan on single-left
    else {
      token.control({ releaseOthers: true });
    }
  }

  /**
   * Handle the Button presses for "Apply All" and "Apply All to All"
   */
  static _onClickApply = (event) => {
    ItemEffectsToChat5e.log('_onClickApply running');
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.dataset?.action;

    const chatCard = $(button).closest('[data-message-id]');
    const chatId = chatCard.data('messageId');
    const chatMessage = game.messages.get(chatId);
    const { actorId, sceneId, tokenId } = chatMessage.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'sourceActor');
    let targetTokenIds = [];
    switch (action) {
      case 'apply-all-effects': {
        const li = $(button).closest('[data-token-id]');
        targetTokenIds.push(li.data('tokenId'));
        break;
      }
      case 'apply-all-effects-to-all': {
        const targetedTokenIds = chatMessage.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'targetedTokenIds');
        targetTokenIds.push(...targetedTokenIds);
        break;
      }
    }

    const effectDatas = chatMessage.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'effectData').map((data) => ({
      ...data,
      disabled: false,
      transfer: false,
    }));

    if (!effectDatas) {
      ui.notifications.warn('This chat card is from before Effects to Chat 2.0, make a new card by reusing the item.');
      return;
    }

    ItemEffectsToChat5e.log('_onClickApply', {
      chatMessage,
      sceneId,
      targetTokenIds,
      effectDatas,
    });

    ItemEffectsToChat5eCanvas.applyEffectsToTokens(sceneId, targetTokenIds, effectDatas);
  }

  /**
   * Register drag drop listeners if GM, otherwise remove the card if player
   */
  static handleRenderChatMessage = async (chatmessage, html) => {

    const dragDroppable = chatmessage.flags?.['auto-roll-npc-save-5e']?.isResultCard 
      || chatmessage.flags?.['attack-roll-check-5e']?.isResultCard
      || chatmessage.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'isEffectListCard');

    if (game.user.isGM && dragDroppable) {
      this._registerDragDropListeners(chatmessage, html);
    }

    if (!chatmessage.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'isEffectListCard')) {
      return;
    }

     else {
      this._removeMessagesForPlayers(chatmessage, html);
    }
  }

  /**
   * Register a drag and drop listener individually so that popped out chat cards work
   */
  static _registerDragDropListeners = (chatmessage, html) => {
    const dragDrop = new DragDrop({
      dragSelector: '[data-effect-uuid]',
      dropSelector: '[data-token-id]',
      permissions: { drag: () => game.user.isGM, drop: () => game.user.isGM },
      callbacks: { dragstart: this._onDragStart, drop: this._onDrop }
    });

    dragDrop.bind(html[0]);
  }

  /**
   * The Drag Start event which populates data to create an effect on drop
   * @param {*} event 
   */
  static _onDragStart = (event) => {
    const li = event.currentTarget;
    const chatCard = $(li).closest('[data-message-id]');
    const chatId = chatCard.data('messageId');
    const chatMessage = game.messages.get(chatId);

    if (!li.dataset.effectUuid || !chatMessage) {
      return;
    }

    const effectDatas = chatMessage.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'effectData');

    if (!effectDatas) {
      ui.notifications.warn('This chat card is from before Effects to Chat 2.0, make a new card by reusing the item.');
      return;
    }

    const { actorId, sceneId, tokenId } = chatMessage.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'sourceActor');

    const effectData = effectDatas?.find((data) => data.id === li.dataset.effectUuid);

    if (!effectData) {
      return;
    }

    // Create drag data
    const dragData = {
      actorId,
      sceneId,
      tokenId,
      type: "ActiveEffect",
      uuid: li.dataset.effectUuid,
      data: {
        ...effectData,
        disabled: false,
        transfer: false,
      }
    };

    ItemEffectsToChat5e.log('DragDrop dragStart:', {
      chatMessage,
      li,
      dataset: li.dataset,
      event,
      dragData
    });

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  };

  /**
   * When an effect is dropped on a target token, apply that effect
   */
  static _onDrop = async (event) => {
    ItemEffectsToChat5e.log('DragDrop drop', {
      event,
    });
    // Try to extract the data
    let dropData;
    try {
      dropData = JSON.parse(event.dataTransfer.getData('text/plain'));
      ItemEffectsToChat5e.log('DragDrop drop', {
        event,
        dropData,
      });

    } catch (err) {
      ItemEffectsToChat5e.log('DragDrop drop', {
        err,
      });

      return false;
    }


    if (dropData.type !== 'ActiveEffect') return false;

    const li = event.currentTarget;
    const chatCard = $(li).closest('[data-message-id]');
    const chatId = chatCard.data('messageId');
    const chatMessage = game.messages.get(chatId);
    const targetTokenId = li.dataset?.tokenId;

    ItemEffectsToChat5e.log('DragDrop drop starting:', {
      event,
      chatMessage,
      li,
      targetTokenId,
      dropData,
    });

    ItemEffectsToChat5eCanvas.applyEffectsToTokens(dropData.sceneId, [targetTokenId], [dropData.data]);
  }

  /**
   * Removes the messages for players which are meant to be blind.
   */
  static _removeMessagesForPlayers = (message, html) => {
    if (!message.getFlag(ItemEffectsToChat5e.MODULE_NAME, 'isEffectListCard')) {
      return;
    }
    if (game.user.isGM) return;

    html.addClass('item-effects-to-chat-5e-remove-blind');
  }
}