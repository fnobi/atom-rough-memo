'use babel';

import { Emitter, CompositeDisposable } from 'atom';

export default class SignInView extends Emitter {

    constructor() {
        super();
        this.disposables = new CompositeDisposable();
        this.render();
        this.show();
    }

    render() {
        const element = document.createElement('form');
        element.classList.add('rough-memo');

        const emailInput = document.createElement('input');
        emailInput.setAttribute('type', 'text');
        emailInput.setAttribute('placeholder', 'email');
        emailInput.classList.add('input-text');
        emailInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
        element.appendChild(emailInput);

        element.appendChild(document.createElement('br'));

        const passwordInput = document.createElement('input');
        passwordInput.setAttribute('type', 'password');
        passwordInput.setAttribute('placeholder', 'password');
        passwordInput.classList.add('input-text');
        element.appendChild(passwordInput);

        element.appendChild(document.createElement('br'));

        const submitInput = document.createElement('button');
        submitInput.setAttribute('type', 'submit');
        submitInput.classList.add('btn', 'btn-primary');
        submitInput.innerHTML = 'Sign In';
        element.appendChild(submitInput);

        this.element = element;
        this.emailInput = emailInput;
        this.passwordInput = passwordInput;
    }

    show() {
        if (!this.panel) {
            this.panel = atom.workspace.addModalPanel({
                item: this,
            });
        }
        this.panel.show();
        this.emailInput.focus();

        this.disposables.add(this.registerAtomCommands());
    }

    hide() {
        if (this.panel) {
            this.panel.destroy();
        }
        this.disposables.dispose();
    }

    registerAtomCommands() {
        return atom.commands.add(this.element, {
            'core:cancel': (event) => {
                event.stopPropagation();
                this.hide();
            },
            'core:confirm': (event) => {
                event.stopPropagation();
                this.emit('submit', {
                    email: this.emailInput.value,
                    password: this.passwordInput.value,
                });
                this.hide();
            },
        });
    }

    getElement() {
        return this.element;
    }
}
