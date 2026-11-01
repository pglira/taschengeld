import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  COLORS,
  type Child,
  type Data,
  DECIMAL,
  addChild,
  addEntry,
  balance,
  formatChange,
  formatMoney,
  formatTime,
  history,
  isDataKey,
  loadData,
  moveChild,
  nextColor,
  removeChild,
  removeEntry,
  saveData,
  updateChild,
} from './money';
import { BackupSheet } from './BackupSheet';
import { Icon, type IconName } from './icons';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, IconName> = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// The open sheet: a change of the money of a child with the initial sign
// (1 adds, -1 subtracts), a child form (id null for a new child) or the backup.
type Sheet =
  | { kind: 'entry'; id: string; sign: 1 | -1 }
  | { kind: 'child'; id: string | null }
  | { kind: 'backup' }
  | null;

export default function App() {
  const [data, setData] = useState<Data>(loadData);
  const [sheet, setSheet] = useState<Sheet>(null);
  // The id of the child whose page is open, or null for the list of children.
  const [page, setPage] = useState<string | null>(null);
  // The id of the row that shows the swipe actions.
  const [swiped, setSwiped] = useState<string | null>(null);
  // True while the list shows drag handles to change the order of the children.
  const [reorder, setReorder] = useState(false);
  const [theme, nextTheme] = useTheme();

  useEffect(() => saveData(data), [data]);

  const close = () => setSheet(null);
  const sheetChild =
    sheet && sheet.kind !== 'backup' ? data.children.find((c) => c.id === sheet.id) : undefined;
  const pageChild = data.children.find((c) => c.id === page);
  const total = data.children.reduce((sum, c) => sum + balance(data, c.id), 0);

  const themeButton = (
    <button className="icon" onClick={nextTheme} aria-label={THEME_LABELS[theme]} title={THEME_LABELS[theme]}>
      <Icon name={THEME_ICONS[theme]} />
    </button>
  );

  return (
    <main>
      {pageChild ? (
        <ChildPage
          data={data}
          child={pageChild}
          swiped={swiped}
          setSwiped={setSwiped}
          themeButton={themeButton}
          onBack={() => setPage(null)}
          onEdit={() => setSheet({ kind: 'child', id: pageChild.id })}
          onEntry={(sign) => setSheet({ kind: 'entry', id: pageChild.id, sign })}
          onRemoveEntry={(id) => setData((d) => removeEntry(d, id))}
        />
      ) : (
        <>
          <header>
            <h1>Taschengeld</h1>
            <div className="header-buttons">
              {data.children.length > 1 && (
                <button
                  className={reorder ? 'icon active' : 'icon'}
                  onClick={() => {
                    setSwiped(null);
                    setReorder((r) => !r);
                  }}
                  aria-pressed={reorder}
                  aria-label="Change order"
                  title="Change order"
                >
                  <Icon name={reorder ? 'check' : 'sort'} />
                </button>
              )}
              {themeButton}
              <button
                className="icon"
                onClick={() => setSheet({ kind: 'backup' })}
                aria-label="Backup"
                title="Backup"
              >
                <Icon name="backup" />
              </button>
              <button
                className="add"
                onClick={() => setSheet({ kind: 'child', id: null })}
                aria-label="Add child"
                title="Add child"
              >
                <Icon name="plus" size={24} />
              </button>
            </div>
          </header>

          {data.children.length === 0 ? (
            <p className="empty">No children. Tap + to add a child.</p>
          ) : (
            <div className="toolbar">
              <span>Total</span>
              <span className="toolbar-total">{formatMoney(total)}</span>
            </div>
          )}

          {reorder && data.children.length > 1 ? (
            <ReorderList data={data} onMove={(from, to) => setData((d) => moveChild(d, from, to))} />
          ) : (
            <ul>
              {data.children.map((child) => {
                const cents = balance(data, child.id);
                return (
                  <SwipeRow
                    key={child.id}
                    className="child"
                    style={{ '--color': child.color } as CSSProperties}
                    open={swiped === child.id}
                    onOpen={() => setSwiped(child.id)}
                    onClose={() => setSwiped(null)}
                    onEdit={() => {
                      setSwiped(null);
                      setSheet({ kind: 'child', id: child.id });
                    }}
                    onDelete={() => {
                      setSwiped(null);
                      setData((d) => removeChild(d, child.id));
                    }}
                  >
                    <button
                      className="info"
                      onClick={() => setPage(child.id)}
                      aria-label={`Show the history of ${child.name}`}
                    >
                      <span className="name">{child.name}</span>
                      <span className={cents < 0 ? 'balance negative' : 'balance'}>{formatMoney(cents)}</span>
                    </button>
                    <div className="steps">
                      <button
                        className="step"
                        onClick={() => setSheet({ kind: 'entry', id: child.id, sign: -1 })}
                        aria-label={`Subtract money from ${child.name}`}
                      >
                        <Icon name="minus" size={24} />
                      </button>
                      <button
                        className="step primary"
                        onClick={() => setSheet({ kind: 'entry', id: child.id, sign: 1 })}
                        aria-label={`Add money to ${child.name}`}
                      >
                        <Icon name="plus" size={24} />
                      </button>
                    </div>
                  </SwipeRow>
                );
              })}
            </ul>
          )}
        </>
      )}

      {sheet?.kind === 'entry' && sheetChild && (
        <EntryForm
          key={sheetChild.id}
          name={sheetChild.name}
          sign={sheet.sign}
          current={balance(data, sheetChild.id)}
          onCancel={close}
          onSave={(cents, note) => {
            setData((d) => addEntry(d, sheetChild.id, cents, note));
            close();
          }}
        />
      )}

      {sheet?.kind === 'backup' && <BackupSheet app="taschengeld" isKey={isDataKey} onClose={close} />}

      {sheet?.kind === 'child' && (
        <ChildForm
          key={sheet.id ?? 'new'}
          name={sheetChild?.name ?? ''}
          color={sheetChild?.color ?? nextColor(data.children)}
          onCancel={close}
          onSave={(name, color) => {
            setData((d) => (sheetChild ? updateChild(d, sheetChild.id, name, color) : addChild(d, name, color)));
            close();
          }}
          onDelete={
            sheetChild
              ? () => {
                  setData((d) => removeChild(d, sheetChild.id));
                  setPage(null);
                  close();
                }
              : undefined
          }
        />
      )}
    </main>
  );
}

interface ReorderListProps {
  data: Data;
  onMove: (from: number, to: number) => void;
}

// The children with a drag handle on each row. Drag a handle up or down to move
// the child. The arrow keys move the child of the focused handle.
function ReorderList({ data, onMove }: ReorderListProps) {
  const children = data.children;
  // The dragged child, the pointer position at which its row is at rest, and
  // the current pointer position.
  const [drag, setDrag] = useState<{ id: string; origin: number; y: number } | null>(null);
  const rows = useRef<HTMLUListElement>(null);

  // The distance between the tops of two rows in pixels.
  const step = () => {
    const ul = rows.current;
    const li = ul?.firstElementChild as HTMLElement | null;
    if (!ul || !li) return 1;
    return li.offsetHeight + parseFloat(getComputedStyle(ul).rowGap || '0');
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return;
    const index = children.findIndex((c) => c.id === drag.id);
    const s = step();
    let origin = drag.origin;
    let to = index;
    while (e.clientY - origin > s / 2 && to < children.length - 1) {
      origin += s;
      to++;
    }
    while (e.clientY - origin < -s / 2 && to > 0) {
      origin -= s;
      to--;
    }
    if (to !== index) onMove(index, to);
    setDrag({ id: drag.id, origin, y: e.clientY });
  };

  const onKeyDown = (e: ReactKeyboardEvent, index: number) => {
    const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : -1;
    if (to < 0 || to >= children.length) return;
    e.preventDefault();
    onMove(index, to);
  };

  const row = (child: Child, index: number) => {
    const dragged = drag?.id === child.id;
    const cents = balance(data, child.id);
    const style = {
      '--color': child.color,
      transform: dragged ? `translateY(${drag.y - drag.origin}px)` : undefined,
    } as CSSProperties;
    return (
      <li key={child.id} className={`child${dragged ? ' dragged' : ''}`} style={style}>
        <span className="info">
          <span className="name">{child.name}</span>
          <span className={cents < 0 ? 'balance negative' : 'balance'}>{formatMoney(cents)}</span>
        </span>
        <button
          className="handle"
          aria-label={`Move ${child.name}`}
          title="Drag to move"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag({ id: child.id, origin: e.clientY, y: e.clientY });
          }}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={(e) => onKeyDown(e, index)}
        >
          <Icon name="grip" size={24} />
        </button>
      </li>
    );
  };

  return (
    <ul ref={rows} className="reorder">
      {children.map(row)}
    </ul>
  );
}

interface ChildPageProps {
  data: Data;
  child: Child;
  swiped: string | null;
  setSwiped: (id: string | null) => void;
  themeButton: ReactNode;
  onBack: () => void;
  onEdit: () => void;
  onEntry: (sign: 1 | -1) => void;
  onRemoveEntry: (id: string) => void;
}

// The balance of one child and the log of all changes, newest first.
function ChildPage(props: ChildPageProps) {
  const { data, child, swiped, setSwiped } = props;
  const cents = balance(data, child.id);
  const entries = history(data, child.id);

  return (
    <>
      <header>
        <button className="icon" onClick={props.onBack} aria-label="Back" title="Back">
          <Icon name="back" />
        </button>
        <h1 className="page-title">{child.name}</h1>
        <div className="header-buttons">
          {props.themeButton}
          <button className="icon" onClick={props.onEdit} aria-label="Edit child" title="Edit child">
            <Icon name="edit" />
          </button>
        </div>
      </header>

      <div className="summary" style={{ '--color': child.color } as CSSProperties}>
        <span className={cents < 0 ? 'balance negative' : 'balance'}>{formatMoney(cents)}</span>
        <div className="summary-buttons">
          <button onClick={() => props.onEntry(-1)}>
            <Icon name="minus" size={18} />
            Subtract
          </button>
          <button className="primary" onClick={() => props.onEntry(1)}>
            <Icon name="plus" size={18} />
            Add
          </button>
        </div>
      </div>

      <h2 className="section">History</h2>
      {entries.length === 0 && <p className="empty">No changes. Tap Add or Subtract.</p>}
      <ul className="log">
        {entries.map((entry) => (
          <SwipeRow
            key={entry.id}
            className="entry"
            open={swiped === entry.id}
            onOpen={() => setSwiped(entry.id)}
            onClose={() => setSwiped(null)}
            onDelete={() => {
              setSwiped(null);
              props.onRemoveEntry(entry.id);
            }}
          >
            <div className="entry-text">
              <span className={entry.note ? 'note' : 'note none'}>{entry.note || 'No description'}</span>
              <span className="time">{formatTime(entry.time)}</span>
            </div>
            <span className={entry.cents < 0 ? 'amount negative' : 'amount'}>
              {formatChange(entry.cents)}
            </span>
          </SwipeRow>
        ))}
      </ul>
    </>
  );
}

// Width of one swipe action in pixels, and the distance a pointer must move
// before a row starts to follow it.
const ACTION_WIDTH = 80;
const SWIPE_SLOP = 10;

interface SwipeRowProps {
  className: string;
  style?: CSSProperties;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  children: ReactNode;
}

// A list row that shows the Delete action, and the Edit action when onEdit is
// set, when the user swipes it to the left. Delete asks for a second tap. A
// swipe to the right, a tap on the row or a tap outside the row hides the
// actions. A tap that ends a swipe does not reach the row content.
function SwipeRow({ className, style, open, onOpen, onClose, onEdit, onDelete, children }: SwipeRowProps) {
  const row = useRef<HTMLLIElement>(null);
  const gesture = useRef<{ x: number; y: number; swiping: boolean } | null>(null);
  const swiped = useRef(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const width = ACTION_WIDTH * (onEdit ? 2 : 1);
  const base = open ? -width : 0;
  const offset = drag ?? base;

  useEffect(() => {
    if (!open) {
      setArmed(false);
      return;
    }
    const onDown = (e: globalThis.PointerEvent) => {
      if (!row.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onClose]);

  const position = (e: PointerEvent) => Math.min(0, Math.max(-width, base + e.clientX - gesture.current!.x));

  const onPointerDown = (e: PointerEvent) => {
    gesture.current = { x: e.clientX, y: e.clientY, swiping: false };
    swiped.current = false;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (!g.swiping) {
      const dx = Math.abs(e.clientX - g.x);
      const dy = Math.abs(e.clientY - g.y);
      if (dy > SWIPE_SLOP && dy > dx) gesture.current = null;
      if (dx <= SWIPE_SLOP || dx <= dy) return;
      g.swiping = true;
      swiped.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag(position(e));
  };

  const onPointerUp = (e: PointerEvent) => {
    if (gesture.current?.swiping) {
      if (position(e) < -width / 2) onOpen();
      else onClose();
    }
    gesture.current = null;
    setDrag(null);
  };

  return (
    <li ref={row} className="swipe">
      <div className="swipe-actions" style={{ width }} aria-hidden={!open}>
        {onEdit && (
          <button className="swipe-edit" tabIndex={open ? 0 : -1} onClick={onEdit}>
            <Icon name="edit" />
            Edit
          </button>
        )}
        <button
          className="swipe-delete"
          tabIndex={open ? 0 : -1}
          onClick={() => (armed ? onDelete() : setArmed(true))}
        >
          <Icon name="trash" />
          {armed ? 'Confirm' : 'Delete'}
        </button>
      </div>
      <div
        className={drag === null ? `${className} settle` : className}
        style={{ ...style, transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
        onClickCapture={(e) => {
          if (!swiped.current && !open) return;
          e.preventDefault();
          e.stopPropagation();
          if (!swiped.current) onClose();
          swiped.current = false;
        }}
      >
        {children}
      </div>
    </li>
  );
}

function SheetFrame(props: {
  title: string;
  onCancel: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="backdrop" onClick={props.onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          props.onSubmit();
        }}
      >
        <h2>{props.title}</h2>
        {props.children}
      </form>
    </div>
  );
}

interface EntryFormProps {
  name: string;
  sign: 1 | -1;
  current: number;
  onSave: (cents: number, note: string) => void;
  onCancel: () => void;
}

// Keys of the keypad, in rows of four. 'back' removes the last character,
// 'clear' removes all characters, '.' starts the cents.
const KEYS = ['7', '8', '9', 'back', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', 'clear'];
const KEY_LABELS: Record<string, ReactNode> = {
  back: <Icon name="backspace" size={26} />,
  clear: 'C',
  '.': DECIMAL,
  '-': <Icon name="minus" size={26} />,
  '+': <Icon name="plus" size={26} />,
};
const MAX_EUROS = 5;

// Add one key to an amount in the form "123" or "123.45": at most MAX_EUROS
// digits before the point and 2 digits after it, without leading zeros.
function typeKey(amount: string, key: string): string {
  const [euros, cents] = amount.split('.');
  if (key === '.') return cents === undefined ? `${euros || '0'}.` : amount;
  if (cents !== undefined) return cents.length < 2 ? amount + key : amount;
  return euros.length < MAX_EUROS ? (euros + key).replace(/^0+(?=\d)/, '') : amount;
}

// Enter a change of the money of a child with a keypad and an optional
// description. A hardware keyboard can also enter the amount.
function EntryForm({ name, sign: initialSign, current, onSave, onCancel }: EntryFormProps) {
  const [amount, setAmount] = useState('');
  const [sign, setSign] = useState(initialSign);
  const [note, setNote] = useState('');
  const cents = sign * Math.round(Number(amount || 0) * 100);

  const press = (key: string) => {
    if (key === 'back') setAmount((a) => a.slice(0, -1));
    else if (key === 'clear') setAmount('');
    else if (key === '-') setSign(-1);
    else if (key === '+') setSign(1);
    else setAmount((a) => typeKey(a, key));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      // Keys in the description field edit the description.
      else if (e.target instanceof HTMLInputElement) return;
      else if (/^[0-9+-]$/.test(e.key)) press(e.key);
      else if (e.key === '.' || e.key === ',') press('.');
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Delete') press('clear');
      else if (e.key === 'Enter') document.querySelector<HTMLFormElement>('form.sheet')?.requestSubmit();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <SheetFrame title={name} onCancel={onCancel} onSubmit={() => cents !== 0 && onSave(cents, note.trim())}>
      <div className="amount-display" aria-live="polite">
        <span className="field-label">{sign > 0 ? 'Money to add' : 'Money to subtract'}</span>
        <output className={sign < 0 ? 'negative' : undefined}>
          {sign < 0 ? '−' : '+'}
          {(amount || '0').replace('.', DECIMAL)} €
        </output>
      </div>
      <div className="keypad">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={
              key === '0'
                ? 'key zero'
                : key === '-' && sign < 0
                  ? 'key on negative'
                  : key === '+' && sign > 0
                    ? 'key on'
                    : 'key'
            }
            onClick={() => press(key)}
            aria-label={key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear' : undefined}
          >
            {KEY_LABELS[key] ?? key}
          </button>
        ))}
      </div>
      <label>
        Description (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: weekly money" />
      </label>
      <p className="preview">
        Balance: {formatMoney(current)} → <strong>{formatMoney(current + cents)}</strong>
      </p>
      <div className="buttons">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={cents === 0}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}

interface ChildFormProps {
  name: string;
  color: string;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function ChildForm(props: ChildFormProps) {
  const [name, setName] = useState(props.name);
  const [color, setColor] = useState(props.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <SheetFrame
      title={props.onDelete ? 'Edit child' : 'New child'}
      onCancel={props.onCancel}
      onSubmit={() => props.onSave(name.trim() || 'Child', color)}
    >
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Child" />
      </label>
      <div className="colors" role="radiogroup" aria-label="Color">
        {COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Color ${i + 1}`}
            className="swatch"
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="buttons">
        {props.onDelete && (
          <button
            type="button"
            className="delete"
            onClick={() => (confirmDelete ? props.onDelete?.() : setConfirmDelete(true))}
          >
            {confirmDelete ? 'Tap to delete' : 'Delete'}
          </button>
        )}
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          Save
        </button>
      </div>
    </SheetFrame>
  );
}
