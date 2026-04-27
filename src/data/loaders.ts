import { Dialogue, Scene } from '../types'
import dramaDialogue from './dialogues/drama-ch1-st1.json'
import travelScene from './scenes/travel-ch1-st1.json'

const dialogueMap: { [key: string]: Dialogue } = {
  'drama-ch1-st1': dramaDialogue as Dialogue,
}

const sceneMap: { [key: string]: Scene } = {
  'travel-ch1-st1': travelScene as Scene,
}

export function getDialogue(stageId: string): Dialogue | null {
  return dialogueMap[stageId] || null
}

export function getScene(stageId: string): Scene | null {
  return sceneMap[stageId] || null
}
