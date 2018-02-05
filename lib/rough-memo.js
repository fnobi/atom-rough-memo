'use babel';

import { CompositeDisposable } from 'atom';
import firebase from 'firebase';
import fs from 'mz/fs';
import path from 'path';
import url from 'url';

import SignInView from './sign-in-view';
import MemoListView from './memo-list-view';

import * as firebaseConfig from '../firebase-config.json';

const PROTOCOL = `rough-${firebaseConfig.projectId}:`;
const USER_HOME = process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];
const TMP_PATH = path.join(USER_HOME, `.memo-${ firebaseConfig.projectId }`);

export default {

    subscriptions: null,
    uid: null,
    memoData: {},

    activate() {
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Init firebase app
        firebase.initializeApp(firebaseConfig);

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'rough-memo:sign-in': () => {
                const view = new SignInView();
                view.on('submit', (e) => {
                    this.startLoginFlow(e.email, e.password);
                });
            },
            'rough-memo:open-private-memo-list': () => this.openPrivateMemoList(),
            'rough-memo:create-memo': () => this.createMemo(),
        }));

        atom.workspace.addOpener((uri) => {
            return this.getEditorForUri(uri);
        });
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    serialize() {},

    signUp(email, password) {
        return firebase.auth().createUserWithEmailAndPassword(
            email,
            password
        );
    },

    signIn(email, password) {
        return firebase.auth().signInWithEmailAndPassword(
            email,
            password
        );
    },

    startLoginFlow(email, password) {
        const onSuccess = (user) => {
            this.uid = user.uid;
            atom.notifications.addSuccess('success', {
                detail: `user: ${user.email}`,
            });
        };

        return this.signUp(email, password).then(onSuccess, (error) => {
            const errorCode = error.code;
            if (errorCode === 'auth/email-already-in-use') {
                return this.signIn(email, password).then(onSuccess);
            } else {
                throw error;
            }
        }).catch((error) => {
            const errorCode = error.code;
            atom.notifications.addError('error', {
                detail: errorCode,
            });
        });
    },

    getEditorForUri(uri) {
        const { protocol } = url.parse(uri);
        if (protocol !== PROTOCOL) return;

        const matchData = uri.match(/\/([^/]+)$/);
        if (!matchData) return;

        const [ , id ] = matchData;
        if (!id) return;

        const pathName = `${TMP_PATH}/${id}.md`;
        const ref = firebase.database().ref(`/privateMemo/${ this.uid }/${ id }/markdown`);
        let initialized = false;

        return atom.workspace.open(pathName).then((view) => {
            const disposable = view.onDidSave(() => {
                ref.set(view.getText()).catch(() => {
                    atom.notifications.addError('error on saving.');
                });
            });
            const onValue = (snapshot) => {
                const markdown = snapshot.val() || '';
                if (!initialized || view.getText() == fs.readFileSync(pathName)) {
                    initialized = true;
                    view.setText(markdown);
                    view.saveAs(pathName).then(() => {
                        atom.notifications.addSuccess('sync.', {
                            detail: id,
                        });
                    });
                } else {
                    this.initTmpDir().then(() => {
                        fs.writeFile(pathName, markdown).then(() => {
                            atom.notifications.addSuccess('updated.', {
                                detail: id,
                            });
                        });
                    });
                }
            };
            ref.on('value', onValue);

            view.onDidDestroy(() => {
                disposable.dispose();
                ref.off('value', onValue);
            });
        });
    },

    initTmpDir() {
        if (fs.existsSync(TMP_PATH)) {
            return Promise.resolve();
        } else {
            return fs.mkdir(TMP_PATH);
        }
    },

    openPrivateMemoList() {
        const ref = firebase.database().ref(`/privateMemo/${ this.uid }`);
        ref.once('value', (res) => {
            this.memoData = res.val();

            new MemoListView({
                memoData: this.memoData,
                onConfirm: ({ id }) => {
                    const uri = `${PROTOCOL}//privateMemo/${ id }`;
                    atom.workspace.open(uri);
                },
            });
        });
    },

    createMemo() {
        const ref = firebase.database().ref(`/privateMemo/${ this.uid }`);
        const id = ref.push().key;
        const defaultTitle = id; // TODO: ロジックをWeb版と一元化
        ref.child(`${ id }/title`).set(defaultTitle).then(() => {
            const uri = `${PROTOCOL}//privateMemo/${ id }`;
            atom.workspace.open(uri);
        });
    },
};
