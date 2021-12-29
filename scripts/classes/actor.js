import { ItemEffectsToChat5e } from '../item-effects-to-chat-5e.js'

/**
 * Handles all the logic related to Actors
 */
export class ItemEffectsToChat5eActor {
  /**
   * Applies copies of the given Effect uuids to the given actor.
   * Sets the sourceId flag with the original effect for cross referencing.
   * Prevents duplicates via checking for effects with the right sourceId flag.
   * 
   * @param {*} actor 
   * @param {*} effectUuids 
   * @returns 
   */
  static async applyEffectToActor(actor, effectUuids) {

    // filter out effectUuids which are already on the target to prevent duplicates
    const effectUuidsNotPresent = effectUuids.filter((effectUuid) => {
      return !actor.effects.some(
        (effect) => effect.data.flags?.[ItemEffectsToChat5e.MODULE_NAME]?.sourceId === effectUuid
      );
    })

    let effectsToCreate = [];

    for (const effectUuid of effectUuidsNotPresent) {
      const effect = await fromUuid(effectUuid);

      // should we store all the effect's data in the chat message? That feels lame...
      if (!effect) {
        ui.notifications.error('There was an error applying effects, the source effect might no longer exist.')
        return;
      }

      const effectToCreate = {
        ...effect.toJSON(),
        origin: effect.parent.uuid,
        disabled: false,
        flags: {
          [ItemEffectsToChat5e.MODULE_NAME]: {
            sourceId: effectUuid
          }
        }
      };

      effectsToCreate.push(effectToCreate);
    }

    if (!effectsToCreate.length) {
      return;
    }

    await actor.createEmbeddedDocuments('ActiveEffect', effectsToCreate);
  }
}

/**
 * Sets up the Hook for dropping actor sheet data to allow dropping from the chat message to the actor sheet.
 */
export class ItemEffectsToChat5eActorSheet {
  static init() {
    Hooks.on('dropActorSheetData', async (actor, _sheet, dropData) => {
      if (dropData.type !== 'ActiveEffect' || !dropData?.effectUuid) {
        return;
      }

      ItemEffectsToChat5e.log('dropped on actor sheet', {
        actor,
        dropData,
      });

      ItemEffectsToChat5eActor.applyEffectToActor(actor, [dropData.effectUuid]);
    })
  }
}
