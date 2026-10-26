import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  House,
  Landmark,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

const INITIAL_SALARY = 24000;

const initialTransactions = [
  { id: 1, date: new Date().toISOString().slice(0, 10), description: "Baon", category: "Needs", amount: 6000 },
  { id: 2, date: new Date().toISOString().slice(0, 10), description: "Utang", category: "Needs", amount: 3000 },
  { id: 3, date: new Date().toISOString().slice(0, 10), description: "Ambag sa Bahay", category: "Needs", amount: 3000 },
];

const categoryOptions = ["Needs", "Wants", "Savings"];
const categoryDetails = {
  Needs: {
    percent: 50,
    label: "Needs",
    subtitle: "Essentials & bills",
    icon: House,
    iconStyle: "needs-icon",
    barStyle: "needs-bar",
  },
  Wants: {
    percent: 30,
    label: "Wants / Luho",
    subtitle: "Lifestyle & fun",
    icon: Sparkles,
    iconStyle: "wants-icon",
    barStyle: "wants-bar",
  },
  Savings: {
    percent: 20,
    label: "Savings",
    subtitle: "Your future fund",
    icon: PiggyBank,
    iconStyle: "savings-icon",
    barStyle: "savings-bar",
  },
};

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function BudgetCard({ category, target, actual }) {
  const details = categoryDetails[category];
  const Icon = details.icon;
  const remaining = target - actual;
  const overBudget = remaining < 0;
  const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const actualLabel = category === "Savings" ? "Saved so far" : "Spent so far";

  return (
    <article className={`budget-card ${overBudget ? "budget-card-over" : ""}`}>
      <div className="budget-card-heading">
        <div className={`category-icon ${details.iconStyle}`}>
          <Icon size={19} strokeWidth={1.8} />
        </div>
        <div>
          <h3>{details.label}</h3>
          <p>{details.subtitle}</p>
        </div>
        <span className={`allocation-pill ${overBudget ? "allocation-over" : ""}`}>
          {details.percent}%
        </span>
      </div>

      <div className="budget-target">
        <span>Monthly target</span>
        <strong>{peso.format(target)}</strong>
      </div>

      <div className="budget-progress">
        <div className="progress-label">
          <span>{actualLabel}</span>
          <strong className={overBudget ? "text-over" : ""}>{peso.format(actual)}</strong>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`${details.label} budget used`}
          aria-valuemin="0"
          aria-valuemax={target}
          aria-valuenow={Math.min(actual, target)}
        >
          <div
            className={`progress-fill ${overBudget ? "over-bar" : details.barStyle}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className={`budget-remaining ${overBudget ? "remaining-over" : ""}`}>
        {overBudget ? (
          <ArrowUpRight size={15} />
        ) : (
          <ArrowDownRight size={15} />
        )}
        <span>{overBudget ? "Over budget by" : "Remaining"}</span>
        <strong>{peso.format(Math.abs(remaining))}</strong>
      </div>
    </article>
  );
}

function TransactionDialog({ transaction, onClose, onSave }) {
  const [form, setForm] = useState(
    transaction ?? {
      date: new Date().toISOString().slice(0, 10),
      description: "",
      category: "Needs",
      amount: "",
    },
  );
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  }

  function submit(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim()) {
      setError("Add a description for this transaction.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than ₱0.00.");
      return;
    }
    onSave({ ...form, amount, description: form.description.trim() });
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="transaction-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">TRANSACTION</span>
            <h2 id="dialog-title">{transaction ? "Edit transaction" : "Add transaction"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label className="form-field">
            <span>Description</span>
            <input
              autoFocus
              name="description"
              placeholder="e.g. Groceries"
              value={form.description}
              onChange={updateField}
              maxLength={80}
            />
          </label>
          <div className="form-grid">
            <label className="form-field">
              <span>Date</span>
              <input name="date" type="date" value={form.date} onChange={updateField} required />
            </label>
            <label className="form-field">
              <span>Category</span>
              <span className="select-wrap">
                <select name="category" value={form.category} onChange={updateField}>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
          </div>
          <label className="form-field">
            <span>Amount</span>
            <span className="amount-input">
              <span>₱</span>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={updateField}
                required
              />
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" type="submit">
              <Check size={16} />
              {transaction ? "Save changes" : "Add transaction"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [salary, setSalary] = useState(INITIAL_SALARY);
  const [salaryDraft, setSalaryDraft] = useState(String(INITIAL_SALARY));
  const [editingSalary, setEditingSalary] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [dialogTransaction, setDialogTransaction] = useState(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salaryError, setSalaryError] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.slice(0, 7) === currentMonthKey),
    [transactions, currentMonthKey],
  );

  const actuals = useMemo(
    () =>
      currentMonthTransactions.reduce(
        (totals, transaction) => ({
          ...totals,
          [transaction.category]: totals[transaction.category] + transaction.amount,
        }),
        { Needs: 0, Wants: 0, Savings: 0 },
      ),
    [currentMonthTransactions],
  );
  const totalAllocated = actuals.Needs + actuals.Wants + actuals.Savings;
  const totalTarget = salary;
  const unallocated = Math.max(totalTarget - totalAllocated, 0);
  const monthlyLabel = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(new Date());

  function saveSalary(event) {
    event.preventDefault();
    const amount = Number(salaryDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSalaryError("Enter a monthly income greater than ₱0.00.");
      return;
    }
    setSalary(amount);
    setSalaryDraft(String(amount));
    setSalaryError("");
    setEditingSalary(false);
  }

  function saveTransaction(transaction) {
    if (dialogTransaction) {
      setTransactions((current) =>
        current.map((item) =>
          item.id === dialogTransaction.id ? { ...transaction, id: item.id } : item,
        ),
      );
    } else {
      setTransactions((current) => [{ ...transaction, id: crypto.randomUUID() }, ...current]);
    }
    closeDialog();
  }

  function closeDialog() {
    setDialogOpen(false);
    setDialogTransaction(undefined);
  }

  function editTransaction(transaction) {
    setDialogTransaction(transaction);
    setDialogOpen(true);
    setOpenMenuId(null);
  }

  function addTransaction() {
    setDialogTransaction(undefined);
    setDialogOpen(true);
  }

  function deleteTransaction(id) {
    setTransactions((current) => current.filter((item) => item.id !== id));
    setOpenMenuId(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar flex items-center justify-between">
        <a className="brand" href="/" aria-label="Budgetly home">
          <span className="brand-mark"><Wallet size={19} strokeWidth={2} /></span>
          <span>budgetly<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="month-chip"><CalendarDays size={15} />{monthlyLabel}</span>
          <span className="avatar" aria-label="Your account">N</span>
        </div>
      </header>

      <main className="dashboard mx-auto">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">YOUR MONEY, IN BALANCE</p>
            <h1>Monthly overview</h1>
            <p className="welcome-copy">A little clarity goes a long way. Here’s your budget at a glance.</p>
          </div>
          <button className="button button-primary add-top-button inline-flex items-center justify-center" type="button" onClick={addTransaction}>
            <Plus size={17} />
            Add transaction
          </button>
        </section>

        <section className="income-panel" aria-label="Monthly income">
          <div className="income-icon"><CircleDollarSign size={22} /></div>
          <div className="income-description">
            <span>Monthly income</span>
            {editingSalary ? (
              <form className="salary-edit-form" onSubmit={saveSalary}>
                <span className="salary-input-wrap">₱
                  <input
                    aria-label="Monthly income amount"
                    autoFocus
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={salaryDraft}
                    onChange={(event) => {
                      setSalaryDraft(event.target.value);
                      setSalaryError("");
                    }}
                  />
                </span>
                <button className="salary-save" type="submit" aria-label="Save monthly income"><Check size={17} /></button>
                <button
                  className="salary-cancel"
                  type="button"
                  aria-label="Cancel editing income"
                  onClick={() => {
                    setSalaryDraft(String(salary));
                    setSalaryError("");
                    setEditingSalary(false);
                  }}
                >
                  <X size={17} />
                </button>
                {salaryError && <span className="salary-error" role="alert">{salaryError}</span>}
              </form>
            ) : (
              <div className="income-value-row">
                <strong>{peso.format(salary)}</strong>
                <button
                  className="edit-income"
                  type="button"
                  onClick={() => setEditingSalary(true)}
                  aria-label="Edit monthly income"
                >
                  <Pencil size={13} /> Edit
                </button>
              </div>
            )}
          </div>
          <div className="income-divider" />
          <div className="allocation-summary">
            <span>50 / 30 / 20 rule</span>
            <p>Your income, thoughtfully allocated</p>
          </div>
          <div className="allocation-split" aria-label="50 percent needs, 30 percent wants, 20 percent savings">
            <span className="split-needs" />
            <span className="split-wants" />
            <span className="split-savings" />
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <h2>Your budget breakdown</h2>
              <p>Keep each part of your income working for you.</p>
            </div>
            <span className="section-period">{monthlyLabel}</span>
          </div>
          <div className="budget-grid grid">
            {categoryOptions.map((category) => (
              <BudgetCard
                key={category}
                category={category}
                target={(salary * categoryDetails[category].percent) / 100}
                actual={actuals[category]}
              />
            ))}
          </div>
        </section>

        <section className="section-block transactions-section">
          <div className="section-heading transactions-heading">
            <div>
              <h2>Recent transactions</h2>
              <p>Your latest budget activity, all in one place.</p>
            </div>
            <button className="button button-secondary add-inline-button" type="button" onClick={addTransaction}>
              <Plus size={16} />
              Add transaction
            </button>
          </div>

          <div className="transaction-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Description</th>
                    <th scope="col">Date</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="amount-column">Amount</th>
                    <th scope="col"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td className="empty-state" colSpan="5">
                        <div className="empty-icon"><Landmark size={20} /></div>
                        <strong>No transactions yet</strong>
                        <span>Add your first transaction to start tracking your budget.</span>
                        <button type="button" className="empty-add" onClick={addTransaction}>
                          <Plus size={15} /> Add a transaction
                        </button>
                      </td>
                    </tr>
                  ) : (
                    [...transactions]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            <div className="transaction-name">
                              <span className={`table-category-icon ${categoryDetails[transaction.category].iconStyle}`}>
                                {transaction.category === "Needs" ? <House size={15} /> : transaction.category === "Wants" ? <Sparkles size={15} /> : <PiggyBank size={15} />}
                              </span>
                              <span className="transaction-description">
                                <span className="description-text">{transaction.description}</span>
                                <span className="mobile-date">{formatDate(transaction.date)}</span>
                              </span>
                            </div>
                          </td>
                          <td className="date-cell">{formatDate(transaction.date)}</td>
                          <td><span className={`category-badge badge-${transaction.category.toLowerCase()}`}>{transaction.category}</span></td>
                          <td className="amount-cell">{peso.format(transaction.amount)}</td>
                          <td className="actions-cell">
                            <div className="row-actions">
                              <button
                                className="row-action"
                                type="button"
                                aria-label={`Edit ${transaction.description}`}
                                onClick={() => editTransaction(transaction)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="row-action delete-action"
                                type="button"
                                aria-label={`Delete ${transaction.description}`}
                                onClick={() => deleteTransaction(transaction.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                className="row-action more-action"
                                type="button"
                                aria-label={`More actions for ${transaction.description}`}
                                aria-expanded={openMenuId === transaction.id}
                                onClick={() => setOpenMenuId(openMenuId === transaction.id ? null : transaction.id)}
                              >
                                <MoreHorizontal size={17} />
                              </button>
                              {openMenuId === transaction.id && (
                                <div className="row-menu">
                                  <button type="button" onClick={() => editTransaction(transaction)}><Pencil size={14} /> Edit</button>
                                  <button type="button" onClick={() => deleteTransaction(transaction.id)}><Trash2 size={14} /> Delete</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {transactions.length > 0 && (
              <div className="table-footer">
                <span>{transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}</span>
                <span className="total-spent"><span>This month</span><strong>{peso.format(totalAllocated)}</strong></span>
              </div>
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>Made for a more mindful month.</span>
          <span className="footer-unallocated"><span className="footer-dot" /> {peso.format(unallocated)} unallocated</span>
        </footer>
      </main>

      {dialogOpen && (
        <TransactionDialog
          transaction={dialogTransaction}
          onClose={closeDialog}
          onSave={saveTransaction}
        />
      )}
    </div>
  );
}

export default App;
