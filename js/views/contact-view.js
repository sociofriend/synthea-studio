// Turns the main call to action into an email link once an address is configured.
export class ContactView {
  constructor({ primary, address, contact }) {
    if (!contact.email) return;
    primary.href = `mailto:${contact.email}?subject=${encodeURIComponent('A project for Synthéa')}`;
    primary.textContent = 'Start a project';
    primary.removeAttribute('rel');
    address.textContent = contact.email;
    address.hidden = false;
  }
}
