'use babel';

import SelectList from 'atom-select-list';
import _ from 'lodash';

export default class MemoListView {
    constructor({ memoData, onConfirm }) {
        this.onConfirm = onConfirm || new Function();

        this.selectList = new SelectList({
            items: this.createMemoArray(memoData),
            elementForItem: (item) => {
                return this.createElementForItem(item);
            },
            filterKeyForItem: (item) => {
                const key = item.query;
                return key;
            },
            didConfirmSelection: (item) => {
                this.confirmed(item);
            },
            didCancelSelection: () => {
                this.hide();
            },
        });

        this.show();
        this.currentPane = atom.workspace.getActivePane();
    }

    show() {
        if (!this.panel) {
            this.panel = atom.workspace.addModalPanel({
                item: this.selectList,
            });
        }
        this.panel.show();
        this.selectList.focus();
    }

    hide() {
        if (this.panel) {
            this.panel.destroy();
        }
    }

    createMemoArray(memoData = {}) {
        return _(memoData).map((memo, id) => {
            const d = new Date(memo.createdAt);
            const queryDate = _.map([
                d.getFullYear(),
                d.getMonth() + 1,
                d.getDate(),
            ], (num) => {
                return _.padStart(num, 2, '0');
            }).join('.');

            const query = [ queryDate, memo.title ].join(' ');

            return _.assignIn({}, memo, { id, queryDate, query });
        }).orderBy('updatedAt', 'desc').value();
    }

    createElementForItem({ title, queryDate }) {
        const li = document.createElement('li');
        li.classList.add('two-lines');

        const primary = document.createElement('div');
        primary.classList.add('primary-line', 'file', 'icon', 'icon-file-text');
        primary.innerHTML = title;
        li.appendChild(primary);

        const secondary = document.createElement('div');
        secondary.classList.add('secondary-line');
        secondary.innerHTML = queryDate;
        li.appendChild(secondary);

        return li;
    }

    confirmed(item) {
        this.onConfirm(item);
        this.hide();
        if (this.currentPane.isAlive()) {
            this.currentPane.activate();
        }
    }
}
