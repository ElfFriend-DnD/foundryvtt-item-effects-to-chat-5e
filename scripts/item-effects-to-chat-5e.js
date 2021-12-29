import { ItemEffectsToChat5eActorSheet } from "./classes/actor.js";
import { ItemEffectsToChat5eCanvas } from "./classes/canvas.js";
import { ItemEffectsToChat5eChat } from "./classes/chat.js";
import { ItemEffectsToChat5eItem } from "./classes/item.js";

export class ItemEffectsToChat5e {
  static MODULE_NAME = "item-effects-to-chat-5e";
  static MODULE_TITLE = "Item Effects to Chat DnD5e";

  static log(...args) {
    if (game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.MODULE_NAME)) {
      console.log(this.MODULE_TITLE, '|', ...args);
    }
  }
}

Hooks.on("ready", async () => {
  console.log(`${ItemEffectsToChat5e.MODULE_NAME} | Initializing ${ItemEffectsToChat5e.MODULE_TITLE}`);

  // initialize item hooks
  ItemEffectsToChat5eItem.init();

  ItemEffectsToChat5eActorSheet.init();
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(ItemEffectsToChat5e.MODULE_NAME);
});

// initialize chat hooks
ItemEffectsToChat5eChat.init();

// initialize canvas hooks
ItemEffectsToChat5eCanvas.init();
