import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  apiRequest,
  clearAccessToken,
  getAccessToken,
  jsonBody,
  saveAccessToken,
} from './api';
import type {
  FinishedProduct,
  Inventory,
  LoginResponse,
  Production,
  ProductionStatus,
  RawMaterial,
  User,
  UserRole,
} from './types';

type PageKey =
  | 'overview'
  | 'raw-materials'
  | 'inventories'
  | 'productions'
  | 'finished-products'
  | 'users';

const userRoles: UserRole[] = [
  'Administrator',
  'Inventory Staff',
  'Production Staff',
];

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function useRecords<T>(endpoint: string | null) {
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState('');

  async function reload() {
    if (!endpoint) return;
    setLoading(true);
    setError('');
    try {
      setRecords(await apiRequest<T[]>(endpoint));
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (!endpoint) {
      setRecords([]);
      setLoading(false);
      setError('');
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError('');
    apiRequest<T[]>(endpoint)
      .then((result) => {
        if (active) setRecords(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(messageFrom(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  return { records, setRecords, loading, error, reload };
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    const token = getAccessToken();
    if (!token) {
      setRestoring(false);
      return;
    }
    apiRequest<User>('/auth/me')
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => clearAccessToken())
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (restoring) return <div className="plan-loading">Loading ManuTrack…</div>;
  if (!user) {
    return (
      <LoginPage
        onLogin={(signedInUser) => setUser(signedInUser)}
      />
    );
  }
  return (
    <Dashboard
      user={user}
      onLogout={() => {
        clearAccessToken();
        setUser(null);
      }}
    />
  );
}

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await apiRequest<User>('/auth/register', {
          method: 'POST',
          body: jsonBody({ email, fullName, password }),
        });
        setMode('login');
        setPassword('');
        setNotice('Administrator account created. Sign in to continue.');
        return;
      }
      const result = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password }),
      });
      saveAccessToken(result.accessToken);
      onLogin(result.user);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page plan-auth-page">
      <section className="auth-panel">
        <div className="auth-brand">Manu<span className="brand-accent">Track</span></div>
        <div className="auth-content">
          <div className="eyebrow">WOODEN FURNITURE WORKSHOP SYSTEM</div>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Set up ManuTrack.'}</h1>
          <p className="muted-copy">
            {mode === 'login'
              ? 'Sign in with your email address to manage your wooden furniture workshop.'
              : 'Create the first Administrator account to get started.'}
          </p>
          {error && <div className="alert-box" role="alert">{error}</div>}
          {notice && <div className="success-box" role="status">{notice}</div>}
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && (
              <label className="field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  maxLength={100}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  value={fullName}
                />
              </label>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="email"
                maxLength={255}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <div className="auth-password-control">
                <input
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  maxLength={72}
                  minLength={mode === 'register' ? 10 : 1}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <button className="button button-primary auth-submit" disabled={busy} type="submit">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create Administrator'}
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? 'First-time setup?' : 'Already have an account?'}
            <button
              onClick={() => {
                setError('');
                setNotice('');
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              type="button"
            >
              {mode === 'login' ? 'Create first account' : 'Sign in'}
            </button>
          </div>
        </div>
        <div className="auth-footnote">Timber · Components · Finished furniture</div>
      </section>
      <aside className="auth-aside">
        <div className="auth-aside-content">
          <div className="eyebrow">FROM TIMBER TO FINISHED FURNITURE</div>
          <h2>Keep your furniture workshop in sync.</h2>
          <p>Track lumber, panels, hardware, finishes, stock, production, and completed furniture.</p>
        </div>
      </aside>
    </main>
  );
}

function Dashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<PageKey>('overview');
  const isAdmin = user.role === 'Administrator';
  const canInventory = isAdmin || user.role === 'Inventory Staff';
  const canProduce = isAdmin || user.role === 'Production Staff';
  const nav: { key: PageKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'raw-materials', label: 'Materials & components' },
    ...(canInventory ? [{ key: 'inventories' as const, label: 'Inventory' }] : []),
    ...(canProduce ? [{ key: 'productions' as const, label: 'Furniture production' }] : []),
    { key: 'finished-products', label: 'Finished furniture' },
    ...(isAdmin ? [{ key: 'users' as const, label: 'Users' }] : []),
  ];

  return (
    <div className="plan-layout">
      <aside className="plan-sidebar">
        <div className="plan-brand">Manu<span>Track</span></div>
        <div className="plan-nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              aria-current={page === item.key ? 'page' : undefined}
              className={page === item.key ? 'plan-nav-item active' : 'plan-nav-item'}
              key={item.key}
              onClick={() => setPage(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="plan-sidebar-user">
          <strong>{user.fullName}</strong>
          <span>{user.role}</span>
          <button onClick={onLogout} type="button">Sign out</button>
        </div>
      </aside>
      <main className="plan-main">
        <header className="plan-header">
          <div>
            <div className="plan-eyebrow">WOODEN FURNITURE OPERATIONS</div>
            <h1>{nav.find((item) => item.key === page)?.label}</h1>
          </div>
          <span className="plan-role">{user.email ?? 'Email not assigned'}</span>
        </header>
        {page === 'overview' && <OverviewPage />}
        {page === 'raw-materials' && <RawMaterialsPage canEdit={canInventory} />}
        {page === 'inventories' && canInventory && <InventoryPage />}
        {page === 'productions' && canProduce && <ProductionsPage user={user} />}
        {page === 'finished-products' && (
          <FinishedProductsPage canCreate={canProduce} currentUser={user} />
        )}
        {page === 'users' && isAdmin && <UsersPage currentUser={user} />}
      </main>
    </div>
  );
}

function OverviewPage() {
  const [counts, setCounts] = useState<number[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<RawMaterial[]>('/raw-materials'),
      apiRequest<Inventory[]>('/inventories').catch(() => [] as Inventory[]),
      apiRequest<Production[]>('/productions').catch(() => [] as Production[]),
      apiRequest<FinishedProduct[]>('/finished-products'),
    ])
      .then((results) => {
        if (active) setCounts(results.map((result) => result.length));
      })
      .catch((requestError: unknown) => {
        if (active) setError(messageFrom(requestError));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="plan-overview">
      <p className="plan-description">
        Keep workshop materials, stock, furniture production, and finished pieces in one place.
      </p>
      {error && <Feedback error={error} />}
      <div className="plan-summary-grid">
        {['Materials & components', 'Stock records', 'Furniture builds', 'Finished furniture'].map(
          (label, index) => (
            <article className="plan-summary-card" key={label}>
              <span>{label}</span>
              <strong>{counts ? counts[index] : '—'}</strong>
            </article>
          ),
        )}
      </div>
      <div className="plan-note">
        Record furniture output and update material stock as your team works. Access to actions depends on your assigned role.
      </div>
    </section>
  );
}

function RawMaterialsPage({ canEdit }: { canEdit: boolean }) {
  const { records, loading, error, reload } = useRecords<RawMaterial>('/raw-materials');
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  function editMaterial(material: RawMaterial) {
    setEditing(material);
    setMaterialName(material.materialName);
    setUnit(material.unit);
    setDescription(material.description ?? '');
  }

  function resetForm() {
    setEditing(null);
    setMaterialName('');
    setUnit('');
    setDescription('');
    setFormError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await apiRequest<RawMaterial>(
        editing ? `/raw-materials/${editing.id}` : '/raw-materials',
        {
          method: editing ? 'PATCH' : 'POST',
          body: jsonBody({
            materialName,
            unit,
            description: description || null,
          }),
        },
      );
      resetForm();
      await reload();
    } catch (requestError) {
      setFormError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="plan-page-grid">
      <PageIntro
        title="Materials & components"
        description="Track lumber, sheet goods, hardware, adhesives, and finishes. Each new item gets a linked stock record."
      />
      {canEdit && (
        <form className="plan-card plan-form" onSubmit={submit}>
          <h2>{editing ? 'Update workshop material' : 'Add workshop material'}</h2>
          <label>Material or component<input maxLength={100} onChange={(event) => setMaterialName(event.target.value)} placeholder="Kiln-dried oak boards" required value={materialName} /></label>
          <label>Unit<input maxLength={30} onChange={(event) => setUnit(event.target.value)} placeholder="board feet, sheets, or pieces" required value={unit} /></label>
          <label>Description<input maxLength={255} onChange={(event) => setDescription(event.target.value)} placeholder="Lumber for table tops" value={description} /></label>
          {formError && <Feedback error={formError} />}
          <div className="plan-form-actions">
            <button className="plan-primary-button" disabled={busy} type="submit">
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add material'}
            </button>
            {editing && <button className="plan-secondary-button" onClick={resetForm} type="button">Cancel</button>}
          </div>
        </form>
      )}
      <div className="plan-card plan-table-card">
        <h2>Workshop materials</h2>
        {error && <Feedback error={error} />}
        <div className="plan-table-wrap">
          <table className="plan-table">
            <thead><tr><th>Material or component</th><th>Unit</th><th>Description</th><th>Available quantity</th>{canEdit && <th />}</tr></thead>
            <tbody>
              {records.map((material) => (
                <tr key={material.id}>
                  <td>{material.materialName}</td>
                  <td>{material.unit}</td>
                  <td>{material.description || '—'}</td>
                  <td>{material.inventory?.quantityAvailable ?? 0}</td>
                  {canEdit && <td><button className="plan-text-button" onClick={() => editMaterial(material)} type="button">Edit</button></td>}
                </tr>
              ))}
              {!loading && records.length === 0 && <EmptyRow colSpan={canEdit ? 5 : 4} />}
            </tbody>
          </table>
        </div>
        {loading && <p className="plan-muted">Loading workshop materials…</p>}
      </div>
    </section>
  );
}

function InventoryPage() {
  const { records, loading, error, reload } = useRecords<Inventory>('/inventories');
  return (
    <section className="plan-page-grid">
      <PageIntro
        title="Inventory"
        description="View and adjust stock for lumber, panels, hardware, and finishing supplies. Values cannot be negative."
      />
      {error && <Feedback error={error} />}
      <div className="plan-card plan-table-card">
        <h2>Inventory records</h2>
        <div className="plan-table-wrap">
          <table className="plan-table">
            <thead><tr><th>Material or component</th><th>Unit</th><th>Available</th><th>Last updated</th><th>Update quantity</th></tr></thead>
            <tbody>
              {records.map((record) => (
                <InventoryRow key={record.id} record={record} onSaved={reload} />
              ))}
              {!loading && records.length === 0 && <EmptyRow colSpan={5} />}
            </tbody>
          </table>
        </div>
        {loading && <p className="plan-muted">Loading material stock…</p>}
      </div>
    </section>
  );
}

function InventoryRow({
  record,
  onSaved,
}: {
  record: Inventory;
  onSaved: () => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(String(record.quantityAvailable));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiRequest<Inventory>(`/inventories/${record.id}`, {
        method: 'PATCH',
        body: jsonBody({ quantityAvailable: Number(quantity) }),
      });
      await onSaved();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>{record.rawMaterial.materialName}</td>
      <td>{record.rawMaterial.unit}</td>
      <td>{record.quantityAvailable}</td>
      <td>{new Date(record.lastUpdated).toLocaleDateString()}</td>
      <td>
        <form className="plan-inline-form" onSubmit={update}>
          <input
            aria-label={`New quantity for ${record.rawMaterial.materialName}`}
            max="99999999.99"
            min="0"
            onChange={(event) => setQuantity(event.target.value)}
            required
            step="0.01"
            type="number"
            value={quantity}
          />
          <button className="plan-secondary-button" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
        {error && <span className="plan-inline-error" role="alert">{error}</span>}
      </td>
    </tr>
  );
}

function ProductionsPage({ user }: { user: User }) {
  const { records, loading, error, reload } = useRecords<Production>('/productions');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [furnitureName, setFurnitureName] = useState('');
  const [quantityProduced, setQuantityProduced] = useState('1');
  const [productionStatus, setProductionStatus] = useState<ProductionStatus>('Completed');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await apiRequest<Production>('/productions', {
        method: 'POST',
        body: jsonBody({
          userId: user.id,
          productionDate,
          furnitureName,
          quantityProduced: Number(quantityProduced),
          productionStatus,
        }),
      });
      setFurnitureName('');
      setQuantityProduced('1');
      await reload();
    } catch (requestError) {
      setFormError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="plan-page-grid">
      <PageIntro title="Furniture production" description="Record furniture pieces made by your account." />
      <form className="plan-card plan-form" onSubmit={submit}>
        <h2>Record a furniture build</h2>
        <label>Production date<input onChange={(event) => setProductionDate(event.target.value)} required type="date" value={productionDate} /></label>
        <label>Furniture name<input maxLength={100} onChange={(event) => setFurnitureName(event.target.value)} placeholder="Oak dining table" required value={furnitureName} /></label>
        <label>Pieces produced<input min="1" onChange={(event) => setQuantityProduced(event.target.value)} required type="number" value={quantityProduced} /></label>
        <label>Production status
          <select onChange={(event) => setProductionStatus(event.target.value as ProductionStatus)} value={productionStatus}>
            <option value="Completed">Completed</option>
            <option value="In Process">In Process</option>
          </select>
        </label>
        {formError && <Feedback error={formError} />}
        <button className="plan-primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Record furniture build'}</button>
      </form>
      <div className="plan-card plan-table-card">
        <h2>Furniture production records</h2>
        {error && <Feedback error={error} />}
        <div className="plan-table-wrap">
          <table className="plan-table">
            <thead><tr><th>Date</th><th>Furniture</th><th>User</th><th>Pieces</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map((record) => (
                <ProductionRecordRow
                  key={record.id}
                  record={record}
                  canManage={
                    user.role === 'Administrator' || record.user.id === user.id
                  }
                  onSaved={reload}
                />
              ))}
              {!loading && records.length === 0 && <EmptyRow colSpan={6} />}
            </tbody>
          </table>
        </div>
        {loading && <p className="plan-muted">Loading furniture production…</p>}
      </div>
    </section>
  );
}

function ProductionRecordRow({
  record,
  canManage,
  onSaved,
}: {
  record: Production;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [productionDate, setProductionDate] = useState(record.productionDate);
  const [furnitureName, setFurnitureName] = useState(record.furnitureName ?? '');
  const [quantityProduced, setQuantityProduced] = useState(
    String(record.quantityProduced),
  );
  const [productionStatus, setProductionStatus] = useState(record.productionStatus);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function startEditing() {
    setProductionDate(record.productionDate);
    setFurnitureName(record.furnitureName ?? '');
    setQuantityProduced(String(record.quantityProduced));
    setProductionStatus(record.productionStatus);
    setError('');
    setEditing(true);
  }

  async function save() {
    setError('');
    setBusy(true);
    try {
      await apiRequest<Production>(`/productions/${record.id}`, {
        method: 'PATCH',
        body: jsonBody({
          productionDate,
          furnitureName: furnitureName.trim(),
          quantityProduced: Number(quantityProduced),
          productionStatus,
        }),
      });
      setEditing(false);
      await onSaved();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete the ${record.furnitureName || 'unnamed furniture'} production record?`,
      )
    ) {
      return;
    }
    setError('');
    setBusy(true);
    try {
      await apiRequest<void>(`/productions/${record.id}`, { method: 'DELETE' });
      await onSaved();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td>
          {editing ? (
            <input
              aria-label="Production date"
              onChange={(event) => setProductionDate(event.target.value)}
              required
              type="date"
              value={productionDate}
            />
          ) : record.productionDate}
        </td>
        <td>
          {editing ? (
            <input
              aria-label="Furniture name"
              maxLength={100}
              onChange={(event) => setFurnitureName(event.target.value)}
              required
              value={furnitureName}
            />
          ) : record.furnitureName || 'Name not recorded'}
        </td>
        <td>{record.user.fullName}</td>
        <td>
          {editing ? (
            <input
              aria-label="Pieces produced"
              min="1"
              onChange={(event) => setQuantityProduced(event.target.value)}
              required
              type="number"
              value={quantityProduced}
            />
          ) : record.quantityProduced}
        </td>
        <td>
          {editing ? (
            <select
              aria-label="Production status"
              onChange={(event) =>
                setProductionStatus(event.target.value as ProductionStatus)
              }
              value={productionStatus}
            >
              <option value="Completed">Completed</option>
              <option value="In Process">In Process</option>
            </select>
          ) : record.productionStatus}
        </td>
        <td>
          {canManage &&
            (editing ? (
              <>
                <button
                  className="plan-text-button"
                  disabled={busy}
                  onClick={() => void save()}
                  type="button"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <button
                  className="plan-text-button"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                  type="button"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="plan-text-button"
                  disabled={busy}
                  onClick={startEditing}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="plan-text-button plan-delete-button"
                  disabled={busy}
                  onClick={() => void remove()}
                  type="button"
                >
                  Delete
                </button>
              </>
            ))}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6}>
            <Feedback error={error} />
          </td>
        </tr>
      )}
    </>
  );
}

function FinishedProductsPage({
  canCreate,
  currentUser,
}: {
  canCreate: boolean;
  currentUser: User;
}) {
  const { records, loading, error, reload } = useRecords<FinishedProduct>('/finished-products');
  const { records: productions } = useRecords<Production>(
    canCreate ? '/productions' : null,
  );
  const [productionId, setProductionId] = useState('');
  const [productName, setProductName] = useState('');
  const [quantityAvailable, setQuantityAvailable] = useState('0');
  const [dateCompleted, setDateCompleted] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await apiRequest<FinishedProduct>('/finished-products', {
        method: 'POST',
        body: jsonBody({
          productionId: Number(productionId),
          productName,
          quantityAvailable: Number(quantityAvailable),
          dateCompleted,
        }),
      });
      setProductName('');
      setQuantityAvailable('0');
      await reload();
    } catch (requestError) {
      setFormError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="plan-page-grid">
      <PageIntro title="Finished furniture" description="Review furniture items linked to their production records." />
      {canCreate && (
        <form className="plan-card plan-form" onSubmit={submit}>
          <h2>Add a finished furniture item</h2>
          <label>Production record
            <select
              onChange={(event) => {
                const nextProductionId = event.target.value;
                const production = productions.find(
                  (item) => item.id === Number(nextProductionId),
                );
                setProductionId(nextProductionId);
                setProductName(production?.furnitureName ?? '');
              }}
              required
              value={productionId}
            >
              <option value="">Select a production record</option>
              {productions.map((production) => (
                <option key={production.id} value={production.id}>
                  {production.furnitureName || 'Unnamed furniture'} · {production.productionDate} · {production.quantityProduced} pieces
                </option>
              ))}
            </select>
          </label>
          <label>Furniture item<input maxLength={100} onChange={(event) => setProductName(event.target.value)} placeholder="Oak dining table" required value={productName} /></label>
          <label>Quantity available<input min="0" onChange={(event) => setQuantityAvailable(event.target.value)} required type="number" value={quantityAvailable} /></label>
          <label>Date completed<input onChange={(event) => setDateCompleted(event.target.value)} required type="date" value={dateCompleted} /></label>
          {formError && <Feedback error={formError} />}
          <button className="plan-primary-button" disabled={busy || productions.length === 0} type="submit">
          {busy ? 'Saving…' : 'Add furniture item'}
          </button>
        </form>
      )}
      <div className="plan-card plan-table-card">
        <h2>Finished furniture records</h2>
        {error && <Feedback error={error} />}
        <div className="plan-table-wrap">
          <table className="plan-table">
            <thead><tr><th>Furniture item</th><th>Production date</th><th>Quantity available</th><th>Date completed</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map((record) => (
                <FinishedFurnitureRecordRow
                  key={record.id}
                  record={record}
                  productions={productions}
                  canManage={
                    currentUser.role === 'Administrator' ||
                    record.production.user.id === currentUser.id
                  }
                  onSaved={reload}
                />
              ))}
              {!loading && records.length === 0 && <EmptyRow colSpan={5} />}
            </tbody>
          </table>
        </div>
        {loading && <p className="plan-muted">Loading finished furniture…</p>}
      </div>
    </section>
  );
}

function FinishedFurnitureRecordRow({
  record,
  productions,
  canManage,
  onSaved,
}: {
  record: FinishedProduct;
  productions: Production[];
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [productionId, setProductionId] = useState(String(record.production.id));
  const [productName, setProductName] = useState(record.productName);
  const [quantityAvailable, setQuantityAvailable] = useState(
    String(record.quantityAvailable),
  );
  const [dateCompleted, setDateCompleted] = useState(record.dateCompleted);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function startEditing() {
    setProductionId(String(record.production.id));
    setProductName(record.productName);
    setQuantityAvailable(String(record.quantityAvailable));
    setDateCompleted(record.dateCompleted);
    setError('');
    setEditing(true);
  }

  async function save() {
    setError('');
    setBusy(true);
    try {
      await apiRequest<FinishedProduct>(`/finished-products/${record.id}`, {
        method: 'PATCH',
        body: jsonBody({
          productionId: Number(productionId),
          productName: productName.trim(),
          quantityAvailable: Number(quantityAvailable),
          dateCompleted,
        }),
      });
      setEditing(false);
      await onSaved();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the ${record.productName} finished-furniture record?`)) {
      return;
    }
    setError('');
    setBusy(true);
    try {
      await apiRequest<void>(`/finished-products/${record.id}`, {
        method: 'DELETE',
      });
      await onSaved();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td>
          {editing ? (
            <input
              aria-label="Furniture item"
              maxLength={100}
              onChange={(event) => setProductName(event.target.value)}
              required
              value={productName}
            />
          ) : record.productName}
        </td>
        <td>
          {editing ? (
            <select
              aria-label="Production record"
              onChange={(event) => setProductionId(event.target.value)}
              required
              value={productionId}
            >
              {productions.map((production) => (
                <option key={production.id} value={production.id}>
                  {production.furnitureName || 'Unnamed furniture'} · {production.productionDate}
                </option>
              ))}
            </select>
          ) : record.production.productionDate}
        </td>
        <td>
          {editing ? (
            <input
              aria-label="Quantity available"
              min="0"
              onChange={(event) => setQuantityAvailable(event.target.value)}
              required
              type="number"
              value={quantityAvailable}
            />
          ) : record.quantityAvailable}
        </td>
        <td>
          {editing ? (
            <input
              aria-label="Date completed"
              onChange={(event) => setDateCompleted(event.target.value)}
              required
              type="date"
              value={dateCompleted}
            />
          ) : record.dateCompleted}
        </td>
        <td>
          {canManage &&
            (editing ? (
              <>
                <button
                  className="plan-text-button"
                  disabled={busy}
                  onClick={() => void save()}
                  type="button"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <button
                  className="plan-text-button"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                  type="button"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="plan-text-button"
                  disabled={busy}
                  onClick={startEditing}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="plan-text-button plan-delete-button"
                  disabled={busy}
                  onClick={() => void remove()}
                  type="button"
                >
                  Delete
                </button>
              </>
            ))}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={5}>
            <Feedback error={error} />
          </td>
        </tr>
      )}
    </>
  );
}

function UsersPage({ currentUser }: { currentUser: User }) {
  const { records, loading, error, reload } = useRecords<User>('/users');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Inventory Staff');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await apiRequest<User>('/users', {
        method: 'POST',
        body: jsonBody({ email, fullName, password, role }),
      });
      setEmail('');
      setFullName('');
      setPassword('');
      await reload();
    } catch (requestError) {
      setFormError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(target: User, nextRole: UserRole) {
    try {
      await apiRequest<User>(`/users/${target.id}`, {
        method: 'PATCH',
        body: jsonBody({ role: nextRole }),
      });
      await reload();
    } catch (requestError) {
      setFormError(messageFrom(requestError));
    }
  }

  async function changeEmail(target: User, nextEmail: string) {
    try {
      await apiRequest<User>(`/users/${target.id}`, {
        method: 'PATCH',
        body: jsonBody({ email: nextEmail }),
      });
      await reload();
    } catch (requestError) {
      setFormError(messageFrom(requestError));
    }
  }

  return (
    <section className="plan-page-grid">
      <PageIntro title="Users" description="Create accounts and assign Administrator, Inventory Staff, or Production Staff permissions." />
      <form className="plan-card plan-form" onSubmit={createUser}>
        <h2>Create user</h2>
        <label>Full name<input maxLength={100} onChange={(event) => setFullName(event.target.value)} required value={fullName} /></label>
        <label>Email address<input autoComplete="email" maxLength={255} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label>Temporary password<input autoComplete="new-password" maxLength={72} minLength={10} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
        <label>Role
          <select onChange={(event) => setRole(event.target.value as UserRole)} value={role}>
            {userRoles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {formError && <Feedback error={formError} />}
        <button className="plan-primary-button" disabled={busy} type="submit">{busy ? 'Creating…' : 'Create user'}</button>
      </form>
      <div className="plan-card plan-table-card">
        <h2>User accounts</h2>
        {error && <Feedback error={error} />}
        <div className="plan-table-wrap">
          <table className="plan-table">
            <thead><tr><th>Full name</th><th>Email address</th><th>Role</th></tr></thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.fullName}</td>
                  <td>
                    <form
                      className="plan-inline-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const input = event.currentTarget.elements.namedItem('email');
                        if (input instanceof HTMLInputElement && input.value) {
                          void changeEmail(record, input.value);
                        }
                      }}
                    >
                      <input
                        aria-label={`Email address for ${record.fullName}`}
                        defaultValue={record.email ?? ''}
                        maxLength={255}
                        name="email"
                        required
                        type="email"
                      />
                      <button className="plan-secondary-button" type="submit">Save</button>
                    </form>
                  </td>
                  <td>
                    <select
                      aria-label={`Role for ${record.email ?? record.fullName}`}
                      disabled={record.id === currentUser.id}
                      onChange={(event) => void changeRole(record, event.target.value as UserRole)}
                      value={record.role}
                    >
                      {userRoles.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && <EmptyRow colSpan={3} />}
            </tbody>
          </table>
        </div>
        {loading && <p className="plan-muted">Loading user accounts…</p>}
      </div>
    </section>
  );
}

function PageIntro({ title, description }: { title: string; description: string }) {
  return <div className="plan-page-intro"><h2>{title}</h2><p>{description}</p></div>;
}

function Feedback({ error }: { error: string }) {
  return <div className="plan-error" role="alert">{error}</div>;
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return <tr><td className="plan-empty" colSpan={colSpan}>No records found.</td></tr>;
}

export default App;
