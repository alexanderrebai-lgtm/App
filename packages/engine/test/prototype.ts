// Charge le prototype web dans un bac à sable pour comparer ses résultats à ceux du moteur.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Proto = Record<string, any>;

export function loadPrototype(): Proto {
  const file = path.resolve(__dirname, '../../../docs/prototype/muscu-app.html');
  const html = fs.readFileSync(file, 'utf8');
  const js = html.split('<script>')[1]!.split('</script>')[0]!.replace('render();updSync();', '');
  const el = () => new Proxy({}, { get: (_t, k) => (k === 'style' ? { setProperty() {} } : undefined) });
  const ctx: Proto = {
    document: { getElementById: el, addEventListener() {}, documentElement: { style: { setProperty() {} } } },
    localStorage: { getItem: () => null, setItem() {} },
    setInterval() {}, setTimeout, clearTimeout, window: {}, navigator: {},
  };
  vm.createContext(ctx);
  vm.runInContext(js, ctx);
  return ctx;
}

/** Règle le profil courant du prototype (clé « d » : sans bloc dos). */
export function setProtoProfile(P: Proto, key: 'a' | 'd', p: Proto, start: string) {
  vm.runInContext(`cur=${JSON.stringify(key)};S.start=${JSON.stringify(start)};S.p[cur]=Object.assign(D(),${JSON.stringify(p)});`, P);
}
