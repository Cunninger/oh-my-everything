import { rerunWithSyntax } from './search'

const syntaxInput = document.getElementById('syntax-input') as HTMLInputElement
const rerunBtn = document.getElementById('btn-rerun') as HTMLButtonElement

rerunBtn.addEventListener('click', rerunWithSyntax)
syntaxInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') rerunWithSyntax()
})
