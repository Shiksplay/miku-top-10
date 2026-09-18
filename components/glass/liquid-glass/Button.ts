import { Container, type ContainerOptions } from './Container'

export type ButtonOptions = ContainerOptions & {
  /** Distorsion centrale (réfraction « base ») : réservée aux boutons play. */
  warp?: boolean
}

/**
 * Port de la classe Button (extends Container). Le texte, la taille et le clic
 * restent gérés par l'élément <button>/<a> React. On conserve `warp` et le mode
 * « verre imbriqué » : ajouté à un Container, le bouton réfracte le rendu de son parent.
 */
export class Button extends Container {
  isNestedGlass = false

  constructor(options: ButtonOptions) {
    super({ ...options, type: options.type ?? 'rounded' })
    this.warp = options.warp ?? false
    this.render()
  }

  setupAsNestedGlass() {
    if (this.parent && !this.isNestedGlass) {
      this.isNestedGlass = true
      this.render()
    }
  }
}
