import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Aperture, Bell, Bookmark, CalendarDays, ChevronDown, ChevronRight,
  Clock3, Cloud, Images, LayoutDashboard, LockKeyhole,
  Mic2, Plus, Search, Sparkles, Upload, X, Trash2,
  FolderPlus, Folder, ArrowLeft, Check, Pencil, Undo2, Star,
  Download, MapPin, Tag, Users
} from "lucide-react";
import "./index.css";

const starterMemories = [
  {
    id: "sample-1",
    title: "Letni wieczór nad morzem",
    date: "2026-08-18",
    type: "Zdjęcia",
    count: "12 zdjęć",
    color: "sea",
    description: "Piękny wieczór nad morzem."
  },
  {
    id: "sample-2",
    title: "Małe chwile, wielkie rzeczy",
    date: "2026-08-12",
    type: "Notatka",
    count: "Notatka",
    color: "sunset",
    description: "Czasami najmniejsze rzeczy znaczą najwięcej."
  },
  {
    id: "sample-3",
    title: "Głos, który chcę pamiętać",
    date: "2026-08-04",
    type: "Nagranie",
    count: "02:34 min",
    color: "voice",
    description: "Wspomnienie głosowe."
  }
];

const navigation = [
  { label: "Przegląd", icon: LayoutDashboard },
  { label: "Oś czasu", icon: Clock3 },
  { label: "Kolekcje", icon: Images },
  { label: "Kapsuły czasu", icon: LockKeyhole },
  { label: "Przypomnienia", icon: Bell },
  { label: "Ulubione", icon: Bookmark }
];

/* ---------- helpers ---------- */

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(value) {
  if (!value) return "";

  return new Date(`${value}T12:00:00`).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function splitLabels(value) {
  return [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];
}

function joinLabels(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function loadList(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// Zwraca false, jeśli zapis się nie udał (np. przepełniony localStorage).
function saveList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- confirm dialog (zamiast window.confirm) ---------- */

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Usuń",
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <motion.div
      className="modal-overlay confirm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <motion.div
        className="memory-modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.16 }}
      >
        <div className="confirm-icon">
          <Trash2 size={22} />
        </div>

        <h2>{title}</h2>
        <p>{message}</p>

        <div className="modal-actions confirm-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            autoFocus
          >
            Anuluj
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
          >
            <Trash2 size={15} /> {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- memory details ---------- */

function MemoryDetails({ memory, onClose, onSave, onRequestDelete, onToggleFavorite, onNotify }) {
  const [editing, setEditing] = useState(false);
  const [image, setImage] = useState(memory.image || "");
  const [form, setForm] = useState({
    title: memory.title,
    description: memory.description || "",
    date: memory.date,
    type: memory.type,
    tags: joinLabels(memory.tags),
    people: joinLabels(memory.people),
    place: memory.place || "",
    reminderDate: memory.reminderDate || ""
  });

  function updateField(event) {
    setForm(current => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onNotify("Wybierz plik graficzny.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onNotify("Zdjęcie może mieć maksymalnie 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  function saveChanges(event) {
    event.preventDefault();

    if (!form.title.trim()) return;

    const imageChanged = image !== (memory.image || "");

    onSave({
      ...memory,
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      tags: splitLabels(form.tags),
      people: splitLabels(form.people),
      place: form.place.trim(),
      image,
      count: imageChanged
        ? (image ? "1 zdjęcie" : "Wspomnienie")
        : (memory.count || "Wspomnienie")
    });

    setEditing(false);
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        className="memory-modal timeline-detail"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.98 }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">
              {editing ? "EDYCJA WSPOMNIENIA" : "TWOJE WSPOMNIENIE"}
            </div>

            <h2>{editing ? "Edytuj wspomnienie" : memory.title}</h2>

            {!editing && (
              <p>{formatDate(memory.date)} · {memory.type}</p>
            )}
          </div>

          <button className="modal-close" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {editing ? (
          <form onSubmit={saveChanges} className="memory-edit-form">
            <label className="field-label">Tytuł</label>

            <input
              className="form-input"
              name="title"
              value={form.title}
              onChange={updateField}
              maxLength={80}
              required
            />

            <div className="form-row">
              <div>
                <label className="field-label">Data</label>

                <input
                  className="form-input"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={updateField}
                  required
                />
              </div>

              <div>
                <label className="field-label">Rodzaj</label>

                <select
                  className="form-input"
                  name="type"
                  value={form.type}
                  onChange={updateField}
                >
                  <option>Zdjęcie</option>
                  <option>Zdjęcia</option>
                  <option>Notatka</option>
                  <option>Nagranie</option>
                  <option>Wideo</option>
                  <option>Wydarzenie</option>
                </select>
              </div>
            </div>

            <label className="field-label">Opis</label>

            <textarea
              className="form-input form-textarea"
              name="description"
              value={form.description}
              onChange={updateField}
              maxLength={1000}
              rows={4}
            />

            <label className="field-label">Tagi</label>
            <input
              className="form-input"
              name="tags"
              value={form.tags}
              onChange={updateField}
              placeholder="np. wakacje, rodzina"
            />

            <label className="field-label">Osoby</label>
            <input
              className="form-input"
              name="people"
              value={form.people}
              onChange={updateField}
              placeholder="Imiona oddzielone przecinkami"
            />

            <label className="field-label">Miejsce</label>
            <input
              className="form-input"
              name="place"
              value={form.place}
              onChange={updateField}
              placeholder="Gdzie wydarzyła się ta chwila?"
            />

            <label className="field-label">Przypomnij mi</label>
            <input
              className="form-input"
              type="date"
              name="reminderDate"
              value={form.reminderDate}
              onChange={updateField}
            />

            <label className="field-label">Zdjęcie</label>

            {image && (
              <div className="edit-image-preview">
                <img src={image} alt="Podgląd wspomnienia" />

                <button
                  type="button"
                  className="remove-image"
                  onClick={() => setImage("")}
                >
                  <X size={15} /> Usuń zdjęcie
                </button>
              </div>
            )}

            <label className="upload-area edit-upload">
              <div className="upload-icon">
                <Upload size={20} />
              </div>

              <strong>Wybierz nowe zdjęcie</strong>
              <span>JPG, PNG lub WEBP · maksymalnie 5 MB</span>

              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                hidden
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditing(false)}
              >
                Anuluj
              </button>

              <button type="submit" className="primary-button">
                Zapisz zmiany
              </button>
            </div>
          </form>
        ) : (
          <>
            {memory.image && (
              <img
                className="timeline-detail-image"
                src={memory.image}
                alt={memory.title}
              />
            )}

            <div className="timeline-detail-description">
              {memory.description || "To wspomnienie nie ma jeszcze opisu."}
            </div>

            {(memory.tags?.length > 0 || memory.people?.length > 0 || memory.place || memory.reminderDate) && (
              <div className="memory-meta-list">
                {memory.tags?.length > 0 && <span><Tag size={14} /> {memory.tags.join(", ")}</span>}
                {memory.people?.length > 0 && <span><Users size={14} /> {memory.people.join(", ")}</span>}
                {memory.place && <span><MapPin size={14} /> {memory.place}</span>}
                {memory.reminderDate && <span><CalendarDays size={14} /> Przypomnienie: {formatDate(memory.reminderDate)}</span>}
              </div>
            )}

            <div className="memory-detail-actions">
              <button
                className={`secondary-button fav-toggle ${memory.favorite ? "active" : ""}`}
                onClick={() => onToggleFavorite(memory.id)}
                aria-pressed={!!memory.favorite}
              >
                <Star size={15} fill={memory.favorite ? "currentColor" : "none"} />
                {memory.favorite ? "W ulubionych" : "Ulubione"}
              </button>

              <button
                className="secondary-button"
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} /> Edytuj
              </button>

              <button
                className="memory-delete-button"
                onClick={() => onRequestDelete(memory)}
              >
                <Trash2 size={15} /> Usuń
              </button>

              <button className="primary-button" onClick={onClose}>
                Zamknij
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------- timeline ---------- */

function TimelineView({
  memories,
  onOpenMemory,
  heading = "Oś czasu",
  eyebrowText = "TWOJA OSOBISTA HISTORIA",
  subtitle = "Wszystkie Twoje chwile, uporządkowane w jednym miejscu.",
  emptyTitle = "Nie masz jeszcze wspomnień",
  emptyText = "Dodaj pierwsze wspomnienie w widoku Przegląd."
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Wszystkie");

  const filters = [
    "Wszystkie",
    "Zdjęcie",
    "Notatka",
    "Nagranie",
    "Wideo",
    "Wydarzenie"
  ];

  const filtered = memories
    .filter(memory => {
      const matchesQuery =
        [memory.title, memory.description, memory.place, ...(memory.tags || []), ...(memory.people || [])]
          .some(value => (value || "").toLowerCase().includes(query.toLowerCase()));

      const matchesType =
        filter === "Wszystkie" ||
        (
          filter === "Zdjęcie"
            ? ["Zdjęcie", "Zdjęcia"].includes(memory.type)
            : memory.type.toLowerCase() === filter.toLowerCase()
        );

      return matchesQuery && matchesType;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const grouped = filtered.reduce((groups, memory) => {
    const date = new Date(`${memory.date}T12:00:00`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!groups[key]) {
      groups[key] = {
        label: date.toLocaleDateString("pl-PL", {
          month: "long",
          year: "numeric"
        }),
        items: []
      };
    }

    groups[key].items.push(memory);
    return groups;
  }, {});

  return (
    <div className="timeline-view">
      <div className="timeline-intro">
        <div>
          <div className="eyebrow">
            <Clock3 size={14} /> {eyebrowText}
          </div>

          <h1>{heading}<span>.</span></h1>

          <p>{subtitle}</p>
        </div>

        <div className="timeline-total">
          <strong>{filtered.length}</strong>
          <span>wspomnień</span>
        </div>
      </div>

      <div className="timeline-toolbar">
        <div className="timeline-search">
          <Search size={18} />

          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Szukaj we wspomnieniach..."
          />

          {query && (
            <button onClick={() => setQuery("")} aria-label="Wyczyść wyszukiwanie">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="timeline-filters">
          {filters.map(item => (
            <button
              key={item}
              className={filter === item ? "selected" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="timeline-groups">
          {Object.entries(grouped).map(([key, group]) => (
            <section className="timeline-group" key={key}>
              <div className="timeline-month">
                <span className="timeline-month-dot" />
                <h2>{group.label}</h2>
                <span>{group.items.length} momentów</span>
              </div>

              <div className="timeline-items">
                {group.items.map(memory => (
                  <motion.button
                    className="timeline-item"
                    key={memory.id}
                    onClick={() => onOpenMemory(memory)}
                    whileHover={{ x: 4 }}
                  >
                    <div
                      className={`timeline-thumbnail ${memory.color || ""}`}
                      style={memory.image ? {
                        backgroundImage: `url(${memory.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                      } : {}}
                    >
                      {!memory.image && <Images size={23} />}
                    </div>

                    <div className="timeline-item-info">
                      <span>
                        {formatDate(memory.date)} · {memory.type}
                      </span>

                      <strong>{memory.title}</strong>

                      <p>
                        {memory.description || "Bez dodatkowego opisu"}
                      </p>
                      {(memory.tags?.length > 0 || memory.place) && (
                        <div className="timeline-meta">
                          {memory.tags?.slice(0, 3).map(tag => <span key={tag}><Tag size={11} /> {tag}</span>)}
                          {memory.place && <span><MapPin size={11} /> {memory.place}</span>}
                        </div>
                      )}
                    </div>

                    {memory.favorite && (
                      <Star size={16} className="fav-mark" fill="currentColor" />
                    )}

                    <ChevronRight size={19} />
                  </motion.button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="timeline-empty">
          <Search size={30} />
          <h3>
            {memories.length === 0
              ? emptyTitle
              : "Nie znaleziono wspomnień"}
          </h3>
          <p>
            {memories.length === 0
              ? emptyText
              : "Spróbuj zmienić wyszukiwanie lub wybrany filtr."}
          </p>

          {memories.length > 0 && (
            <button onClick={() => {
              setQuery("");
              setFilter("Wszystkie");
            }}>
              Wyczyść filtry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- collections ---------- */

function CollectionsView({ collections, setCollections, memories, onToast }) {
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const selected = collections.find(item => item.id === selectedId);

  const createCollection = () => {
    const cleanName = name.trim();

    if (!cleanName) return;

    const collection = {
      id: makeId(),
      name: cleanName,
      description: description.trim(),
      memoryIds: [],
      createdAt: new Date().toISOString()
    };

    setCollections(current => [collection, ...current]);
    setName("");
    setDescription("");
    setCreating(false);
  };

  const confirmDeleteCollection = () => {
    const target = pendingDelete;
    setPendingDelete(null);

    if (!target) return;

    const index = collections.findIndex(item => item.id === target.id);

    setCollections(current => current.filter(item => item.id !== target.id));

    if (selectedId === target.id) setSelectedId(null);

    onToast(`Usunięto kolekcję „${target.name}”`, () => {
      setCollections(current => {
        if (current.some(item => item.id === target.id)) return current;

        const next = [...current];
        next.splice(Math.min(Math.max(index, 0), next.length), 0, target);
        return next;
      });
    });
  };

  const toggleMemory = (collectionId, memoryId) => {
    setCollections(current =>
      current.map(collection => {
        if (collection.id !== collectionId) return collection;

        const exists = collection.memoryIds.includes(memoryId);

        return {
          ...collection,
          memoryIds: exists
            ? collection.memoryIds.filter(id => id !== memoryId)
            : [...collection.memoryIds, memoryId]
        };
      })
    );
  };

  const collectionMemories = selected
    ? memories.filter(memory => selected.memoryIds.includes(memory.id))
    : [];

  return (
    <div className="collections-view">
      <div className="collections-heading">
        <div>
          <div className="eyebrow">
            <Folder size={14} /> TWOJE PRYWATNE ALBUMY
          </div>

          <h1>Kolekcje<span>.</span></h1>
          <p>Grupuj wspomnienia w osobiste historie.</p>
        </div>

        {!selected && (
          <button
            className="primary-button"
            onClick={() => setCreating(true)}
          >
            <Plus size={17} /> Nowa kolekcja
          </button>
        )}
      </div>

      {selected ? (
        <div className="collection-detail">
          <button
            className="collection-back"
            onClick={() => setSelectedId(null)}
          >
            <ArrowLeft size={16} /> Wszystkie kolekcje
          </button>

          <div className="collection-detail-heading">
            <div>
              <span className="collection-kicker">KOLEKCJA</span>
              <h2>{selected.name}</h2>
              <p>
                {selected.description || "Twoja prywatna kolekcja wspomnień."}
              </p>
            </div>

            <div className="collection-count">
              <strong>{collectionMemories.length}</strong>
              <span>wspomnień</span>
            </div>
          </div>

          <div className="collection-memory-list">
            {memories.map(memory => {
              const active = selected.memoryIds.includes(memory.id);

              return (
                <button
                  className={`collection-memory-option ${active ? "active" : ""}`}
                  key={memory.id}
                  onClick={() => toggleMemory(selected.id, memory.id)}
                >
                  <div className="collection-memory-thumb">
                    {memory.image ? (
                      <img src={memory.image} alt="" />
                    ) : (
                      <Images size={20} />
                    )}
                  </div>

                  <div className="collection-memory-info">
                    <strong>{memory.title}</strong>
                    <span>
                      {formatDate(memory.date)} · {memory.type}
                    </span>
                  </div>

                  <span className="collection-check">
                    {active && <Check size={15} />}
                  </span>
                </button>
              );
            })}

            {memories.length === 0 && (
              <div className="collections-empty">
                <Images size={28} />
                <h3>Nie masz jeszcze wspomnień</h3>
                <p>
                  Dodaj pierwsze wspomnienie, aby umieścić je w kolekcji.
                </p>
              </div>
            )}
          </div>

          <p className="collection-hint">
            Kliknij wspomnienie, aby dodać je do kolekcji lub z niej usunąć.
          </p>
        </div>
      ) : (
        <>
          {collections.length > 0 ? (
            <div className="collections-grid">
              {collections.map(collection => {
                const count = collection.memoryIds.filter(id =>
                  memories.some(memory => memory.id === id)
                ).length;

                const cover = memories.find(memory =>
                  collection.memoryIds.includes(memory.id) && memory.image
                );

                return (
                  <motion.div
                    className="collection-card"
                    key={collection.id}
                    whileHover={{ y: -4 }}
                  >
                    <button
                      className="collection-card-main"
                      onClick={() => setSelectedId(collection.id)}
                    >
                      <div className="collection-cover">
                        {cover ? (
                          <img src={cover.image} alt="" />
                        ) : (
                          <div className="collection-cover-placeholder">
                            <Images size={31} />
                          </div>
                        )}

                        <span className="collection-cover-count">
                          {count} {count === 1 ? "wspomnienie" : "wspomnień"}
                        </span>
                      </div>

                      <div className="collection-card-info">
                        <h3>{collection.name}</h3>
                        <p>
                          {collection.description || "Osobista kolekcja wspomnień"}
                        </p>
                      </div>
                    </button>

                    <button
                      className="collection-delete"
                      title="Usuń kolekcję"
                      aria-label={`Usuń kolekcję ${collection.name}`}
                      onClick={() => setPendingDelete(collection)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="collections-empty">
              <div className="collections-empty-icon">
                <FolderPlus size={32} />
              </div>

              <h3>Twoja historia czeka na uporządkowanie</h3>
              <p>
                Utwórz pierwszą kolekcję i zacznij grupować swoje wspomnienia.
              </p>

              <button
                className="primary-button"
                onClick={() => setCreating(true)}
              >
                <Plus size={17} /> Utwórz kolekcję
              </button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {creating && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={event => {
              if (event.target === event.currentTarget) {
                setCreating(false);
              }
            }}
          >
            <motion.div
              className="memory-modal collection-create-modal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
            >
              <div className="modal-header">
                <div>
                  <div className="modal-eyebrow">NOWY ALBUM</div>
                  <h2>Nowa kolekcja</h2>
                  <p>Stwórz miejsce na swoje wyjątkowe chwile.</p>
                </div>

                <button
                  className="modal-close"
                  onClick={() => setCreating(false)}
                  aria-label="Zamknij"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="collection-form">
                <label className="field-label">Nazwa kolekcji</label>

                <input
                  className="form-input"
                  placeholder="Np. Wakacje 2026"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") createCollection();
                  }}
                  maxLength={45}
                  autoFocus
                />

                <label className="field-label">Opis (opcjonalnie)</label>

                <textarea
                  className="form-input form-textarea"
                  placeholder="Kilka słów o tej kolekcji..."
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  maxLength={180}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setCreating(false)}
                >
                  Anuluj
                </button>

                <button
                  className="primary-button"
                  onClick={createCollection}
                  disabled={!name.trim()}
                >
                  Utwórz kolekcję
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDialog
            title="Usunąć kolekcję?"
            message={`Kolekcja „${pendingDelete.name}” zostanie usunięta. Same wspomnienia pozostaną zapisane.`}
            confirmLabel="Usuń kolekcję"
            onConfirm={confirmDeleteCollection}
            onCancel={() => setPendingDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CapsulesView({ capsules, setCapsules, memories, onOpenMemory, onToast }) {
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unlockDate, setUnlockDate] = useState(() =>
    localDateValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  );
  const [memoryIds, setMemoryIds] = useState([]);
  const selected = capsules.find(capsule => capsule.id === selectedId);
  const today = localDateValue();

  function createCapsule(event) {
    event.preventDefault();
    if (!name.trim() || !unlockDate) return;

    setCapsules(current => [{
      id: makeId(),
      name: name.trim(),
      description: description.trim(),
      unlockDate,
      memoryIds,
      createdAt: new Date().toISOString()
    }, ...current]);
    setName("");
    setDescription("");
    setMemoryIds([]);
    setCreating(false);
  }

  function deleteCapsule(capsule) {
    const index = capsules.findIndex(item => item.id === capsule.id);
    setCapsules(current => current.filter(item => item.id !== capsule.id));
    if (selectedId === capsule.id) setSelectedId(null);
    onToast(`Usunięto kapsułę „${capsule.name}”`, () => {
      setCapsules(current => {
        if (current.some(item => item.id === capsule.id)) return current;
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, capsule);
        return next;
      });
    });
  }

  return (
    <div className="capsules-view">
      <div className="collections-heading">
        <div>
          <div className="eyebrow"><LockKeyhole size={14} /> WIADOMOŚĆ DLA PRZYSZŁOŚCI</div>
          <h1>Kapsuły czasu<span>.</span></h1>
          <p>Schowaj wspomnienia i otwórz je w wybranym dniu.</p>
        </div>
        {!selected && (
          <button className="primary-button" onClick={() => setCreating(true)}>
            <Plus size={17} /> Nowa kapsuła
          </button>
        )}
      </div>

      {selected ? (
        <section className="capsule-detail">
          <button className="collection-back" onClick={() => setSelectedId(null)}>
            <ArrowLeft size={16} /> Wszystkie kapsuły
          </button>
          <div className="collection-detail-heading">
            <div>
              <span className="collection-kicker">OTWARTA KAPSUŁA</span>
              <h2>{selected.name}</h2>
              <p>{selected.description || `Utworzono ${formatDate(selected.createdAt?.slice(0, 10))}`}</p>
            </div>
            <div className="collection-count">
              <strong>{selected.memoryIds?.length || 0}</strong><span>wspomnień</span>
            </div>
          </div>
          <div className="capsule-memory-list">
            {memories.filter(memory => selected.memoryIds?.includes(memory.id)).map(memory => (
              <button className="collection-memory-option" key={memory.id} onClick={() => onOpenMemory(memory)}>
                <div className="collection-memory-thumb">
                  {memory.image ? <img src={memory.image} alt="" /> : <Images size={20} />}
                </div>
                <div className="collection-memory-info">
                  <strong>{memory.title}</strong>
                  <span>{formatDate(memory.date)} · {memory.type}</span>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
            {(!selected.memoryIds || selected.memoryIds.length === 0) && (
              <div className="collections-empty"><h3>Ta kapsuła jest pusta</h3><p>Przy tworzeniu możesz dołączyć wspomnienia.</p></div>
            )}
          </div>
          <button className="danger-text-button" onClick={() => deleteCapsule(selected)}>
            <Trash2 size={15} /> Usuń kapsułę
          </button>
        </section>
      ) : capsules.length ? (
        <div className="capsules-grid">
          {capsules.map(capsule => {
            const unlocked = capsule.unlockDate <= today;
            return (
              <article className="capsule-card" key={capsule.id}>
                <div className={`capsule-status ${unlocked ? "unlocked" : "locked"}`}>
                  <LockKeyhole size={18} />
                  {unlocked ? "Można otworzyć" : `Zamknięta do ${formatDate(capsule.unlockDate)}`}
                </div>
                <h2>{capsule.name}</h2>
                <p>{unlocked
                  ? (capsule.description || "Osobista wiadomość dla przyszłości.")
                  : "Zawartość kapsuły pozostaje ukryta do dnia otwarcia."}
                </p>
                <div className="capsule-card-footer">
                  <span>{capsule.memoryIds?.length || 0} wspomnień</span>
                  <button className="icon-button" onClick={() => deleteCapsule(capsule)} aria-label={`Usuń kapsułę ${capsule.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <button
                  className={unlocked ? "primary-button" : "secondary-button capsule-locked-button"}
                  disabled={!unlocked}
                  onClick={() => setSelectedId(capsule.id)}
                >
                  {unlocked ? "Otwórz kapsułę" : "Jeszcze nie teraz"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="collections-empty">
          <div className="collections-empty-icon"><LockKeyhole size={30} /></div>
          <h3>Twoja pierwsza kapsuła czeka</h3>
          <p>Wybierz dzień otwarcia i dołącz wspomnienia, które chcesz odkryć ponownie.</p>
          <button className="primary-button" onClick={() => setCreating(true)}><Plus size={17} /> Utwórz kapsułę</button>
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => event.target === event.currentTarget && setCreating(false)}>
            <motion.form className="memory-modal" onSubmit={createCapsule} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}>
              <div className="modal-header">
                <div><div className="modal-eyebrow">ZAPIS DLA PRZYSZŁOŚCI</div><h2>Nowa kapsuła czasu</h2><p>Wspomnienia pozostaną ukryte do wybranego dnia.</p></div>
                <button type="button" className="modal-close" onClick={() => setCreating(false)} aria-label="Zamknij"><X size={20} /></button>
              </div>
              <label className="field-label" htmlFor="capsule-name">Nazwa</label>
              <input id="capsule-name" className="form-input" value={name} onChange={event => setName(event.target.value)} maxLength={70} required autoFocus />
              <label className="field-label" htmlFor="capsule-description">Wiadomość (opcjonalnie)</label>
              <textarea id="capsule-description" className="form-input form-textarea" value={description} onChange={event => setDescription(event.target.value)} maxLength={500} rows={3} />
              <label className="field-label" htmlFor="capsule-date">Otwórz dnia</label>
              <input id="capsule-date" className="form-input" type="date" min={today} value={unlockDate} onChange={event => setUnlockDate(event.target.value)} required />
              <div className="field-label">Dołącz wspomnienia</div>
              <div className="capsule-choices">
                {memories.map(memory => (
                  <label className="capsule-memory-choice" key={memory.id}>
                    <input type="checkbox" checked={memoryIds.includes(memory.id)} onChange={() => setMemoryIds(current => current.includes(memory.id) ? current.filter(id => id !== memory.id) : [...current, memory.id])} />
                    <span>{memory.title}</span><small>{formatDate(memory.date)}</small>
                  </label>
                ))}
                {memories.length === 0 && <p>Dodaj wspomnienia, aby dołączyć je do kapsuły.</p>}
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setCreating(false)}>Anuluj</button>
                <button type="submit" className="primary-button"><LockKeyhole size={16} /> Zamknij kapsułę</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RemindersView({ memories, onOpenMemory, onAddMemory }) {
  const today = localDateValue();
  const reminders = memories
    .filter(memory => memory.reminderDate)
    .sort((a, b) => a.reminderDate.localeCompare(b.reminderDate));

  return (
    <div className="reminders-view">
      <div className="timeline-intro">
        <div>
          <div className="eyebrow"><Bell size={14} /> CHWILE, DO KTÓRYCH WARTO WRÓCIĆ</div>
          <h1>Przypomnienia<span>.</span></h1>
          <p>Daty przypisane do Twoich wspomnień.</p>
        </div>
        <button className="primary-button" onClick={onAddMemory}><Plus size={16} /> Dodaj wspomnienie</button>
      </div>
      {reminders.length ? (
        <div className="reminder-list">
          {reminders.map(memory => {
            const overdue = memory.reminderDate < today;
            const due = memory.reminderDate === today;
            return (
              <button className="reminder-item" key={memory.id} onClick={() => onOpenMemory(memory)}>
                <span className={`reminder-date ${overdue ? "overdue" : ""}`}>
                  <strong>{new Date(`${memory.reminderDate}T12:00:00`).toLocaleDateString("pl-PL", { day: "numeric" })}</strong>
                  <small>{new Date(`${memory.reminderDate}T12:00:00`).toLocaleDateString("pl-PL", { month: "short" })}</small>
                </span>
                <span className="reminder-copy"><strong>{memory.title}</strong><small>{overdue ? "Termin minął" : due ? "Dzisiaj" : "Zaplanowane"} · {formatDate(memory.reminderDate)}</small></span>
                <ChevronRight size={18} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="collections-empty">
          <div className="collections-empty-icon"><CalendarDays size={30} /></div>
          <h3>Brak zaplanowanych przypomnień</h3>
          <p>Dodaj datę przypomnienia do wspomnienia, aby znaleźć je tutaj.</p>
          <button className="primary-button" onClick={onAddMemory}><Plus size={17} /> Dodaj wspomnienie</button>
        </div>
      )}
    </div>
  );
}

function BackupView({ storageBytes, onExport, onImport }) {
  const megabytes = (storageBytes / (1024 * 1024)).toFixed(2);
  const usage = Math.min(100, storageBytes / (5 * 1024 * 1024) * 100);

  return (
    <div className="backup-view">
      <div className="timeline-intro">
        <div>
          <div className="eyebrow"><Cloud size={14} /> TWOJE DANE POZOSTAJĄ NA TYM URZĄDZENIU</div>
          <h1>Kopie zapasowe<span>.</span></h1>
          <p>Eksportuj wspomnienia jako plik JSON i przywróć je na tym lub innym urządzeniu.</p>
        </div>
      </div>
      <section className="backup-storage">
        <div className="storage-heading"><span>Szacowane użycie pamięci przeglądarki</span><strong>{megabytes} MB</strong></div>
        <div className="storage-bar"><span style={{ width: `${usage}%` }} /></div>
        <p>Przybliżony wskaźnik względem typowego limitu 5 MB. Rzeczywisty limit zależy od przeglądarki.</p>
      </section>
      <section className="backup-actions">
        <div><Download size={21} /><h2>Eksportuj kopię</h2><p>Zapisz wspomnienia, kolekcje i kapsuły w jednym pliku.</p><button className="primary-button" onClick={onExport}><Download size={16} /> Pobierz kopię JSON</button></div>
        <div><Upload size={21} /><h2>Przywróć kopię</h2><p>Import zastąpi bieżące wspomnienia, kolekcje i kapsuły.</p><label className="secondary-button backup-import">Wybierz plik JSON<input type="file" accept="application/json,.json" onChange={onImport} hidden /></label></div>
      </section>
    </div>
  );
}

/* ---------- app ---------- */

function App() {
  const [activePage, setActivePage] = useState("Przegląd");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [memories, setMemories] = useState(() =>
    loadList("moment_memories", starterMemories)
  );

  const [collections, setCollections] = useState(() =>
    loadList("moment_collections", [])
  );

  const [capsules, setCapsules] = useState(() =>
    loadList("moment_capsules", [])
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: localDateValue(),
    type: "Zdjęcie",
    tags: "",
    people: "",
    place: "",
    reminderDate: ""
  });

  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");

  // Zapis do localStorage w efektach (bez efektów ubocznych w updaterach stanu).
  useEffect(() => {
    if (!saveList("moment_memories", memories)) {
      showToast("Nie udało się zapisać zmian – pamięć przeglądarki jest pełna.");
    }
  }, [memories]);

  useEffect(() => {
    saveList("moment_collections", collections);
  }, [collections]);

  useEffect(() => {
    saveList("moment_capsules", capsules);
  }, [capsules]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(message, undo) {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  function dismissToast() {
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  function updateForm(event) {
    setForm(current => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Wybierz plik graficzny.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Zdjęcie może mieć maksymalnie 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result);
      setImageName(file.name);
    };

    reader.readAsDataURL(file);
  }

  function addMemory(event) {
    event.preventDefault();

    const newMemory = {
      id: makeId(),
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      type: form.type,
      tags: splitLabels(form.tags),
      people: splitLabels(form.people),
      place: form.place.trim(),
      reminderDate: form.reminderDate,
      createdAt: new Date().toISOString(),
      count: image ? "1 zdjęcie" : "Wspomnienie",
      color: "custom",
      image,
      custom: true
    };

    setMemories(current => [newMemory, ...current]);

    setForm({
      title: "",
      description: "",
      date: localDateValue(),
      type: "Zdjęcie",
      tags: "",
      people: "",
      place: "",
      reminderDate: ""
    });

    setImage("");
    setImageName("");
    setShowModal(false);
  }

  // Krok 1: użytkownik klika „Usuń” – pokazujemy własne okno potwierdzenia.
  function requestDelete(memory) {
    setPendingDelete(memory);
  }

  // Krok 2: potwierdzenie – usuwamy, a w toaście dajemy możliwość cofnięcia.
  function confirmDelete() {
    const memory = pendingDelete;
    setPendingDelete(null);

    if (!memory) return;

    const index = memories.findIndex(item => item.id === memory.id);
    const memberOf = collections
      .filter(collection => (collection.memoryIds || []).includes(memory.id))
      .map(collection => collection.id);

    setMemories(current => current.filter(item => item.id !== memory.id));

    setCollections(current =>
      current.map(collection => ({
        ...collection,
        memoryIds: (collection.memoryIds || []).filter(id => id !== memory.id)
      }))
    );

    setSelectedMemory(null);

    showToast(`Usunięto „${memory.title}”`, () => {
      setMemories(current => {
        if (current.some(item => item.id === memory.id)) return current;

        const next = [...current];
        next.splice(Math.min(Math.max(index, 0), next.length), 0, memory);
        return next;
      });

      setCollections(current =>
        current.map(collection =>
          memberOf.includes(collection.id) &&
          !(collection.memoryIds || []).includes(memory.id)
            ? { ...collection, memoryIds: [...(collection.memoryIds || []), memory.id] }
            : collection
        )
      );
    });
  }

  function toggleFavorite(id) {
    setMemories(current =>
      current.map(memory =>
        memory.id === id ? { ...memory, favorite: !memory.favorite } : memory
      )
    );

    // Okno szczegółów trzyma własną kopię – odświeżamy ją też.
    setSelectedMemory(current =>
      current && current.id === id
        ? { ...current, favorite: !current.favorite }
        : current
    );
  }

  const favoriteMemories = memories.filter(memory => memory.favorite);
  const reminderMemories = memories.filter(memory => memory.reminderDate);
  const currentMonth = localDateValue().slice(0, 7);
  const thisMonthCount = memories.filter(memory =>
    memory.custom && (memory.createdAt || memory.date || "").startsWith(currentMonth)
  ).length;
  const storageBytes = new Blob([JSON.stringify({ memories, collections, capsules })]).size;
  const storagePercent = Math.min(100, storageBytes / (5 * 1024 * 1024) * 100);
  const matchingMemories = globalQuery.trim()
    ? memories.filter(memory => [
      memory.title,
      memory.description,
      memory.place,
      ...(memory.tags || []),
      ...(memory.people || [])
    ].some(value => (value || "").toLowerCase().includes(globalQuery.trim().toLowerCase())))
      .slice(0, 6)
    : [];

  function exportBackup() {
    const backup = {
      format: "moment-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      memories,
      collections,
      capsules
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `moment-kopia-${localDateValue()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Kopia zapasowa została pobrana.");
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text());
      if (
        backup.format !== "moment-backup" ||
        !Array.isArray(backup.memories) ||
        !Array.isArray(backup.collections) ||
        (backup.capsules !== undefined && !Array.isArray(backup.capsules)) ||
        !backup.memories.every(memory => memory && typeof memory.id === "string" && typeof memory.title === "string")
      ) {
        throw new Error("Nieprawidłowy format kopii.");
      }

      setPendingBackup({
        memories: backup.memories.map(memory => ({
          ...memory,
          tags: Array.isArray(memory.tags) ? memory.tags : [],
          people: Array.isArray(memory.people) ? memory.people : [],
          place: memory.place || "",
          reminderDate: memory.reminderDate || ""
        })),
        collections: backup.collections.map(collection => ({
          ...collection,
          memoryIds: Array.isArray(collection.memoryIds) ? collection.memoryIds : []
        })),
        capsules: (backup.capsules || []).map(capsule => ({
          ...capsule,
          memoryIds: Array.isArray(capsule.memoryIds) ? capsule.memoryIds : []
        }))
      });
    } catch {
      showToast("Nie udało się odczytać kopii. Wybierz poprawny plik JSON.");
    } finally {
      event.target.value = "";
    }
  }

  function restoreBackup() {
    if (!pendingBackup) return;
    setMemories(pendingBackup.memories);
    setCollections(pendingBackup.collections);
    setCapsules(pendingBackup.capsules);
    setPendingBackup(null);
    showToast("Kopia została przywrócona.");
  }

  function saveMemory(updatedMemory) {
    setMemories(current =>
      current.map(memory =>
        memory.id === updatedMemory.id ? updatedMemory : memory
      )
    );

    // Okno szczegółów ma od razu pokazać zapisane dane.
    setSelectedMemory(updatedMemory);
  }

  const pageMode =
    activePage === "Oś czasu" || activePage === "Ulubione"
      ? "timeline-mode"
      : activePage === "Kolekcje"
        ? "collections-mode"
        : activePage === "Kapsuły czasu"
          ? "capsules-mode"
          : activePage === "Przypomnienia"
            ? "reminders-mode"
            : activePage === "Kopie zapasowe"
              ? "backup-mode"
        : "";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Aperture size={22} strokeWidth={1.8} />
          </div>

          <span>moment<span className="brand-dot">.</span></span>
        </div>

        <div className="sidebar-label">MENU</div>

        <nav className="navigation">
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`nav-item ${activePage === item.label ? "active" : ""}`}
                onClick={() => setActivePage(item.label)}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>

                {item.label === "Kapsuły czasu" && (
                  <span className="nav-count">{capsules.length}</span>
                )}

                {item.label === "Przypomnienia" && reminderMemories.length > 0 && (
                  <span className="nav-count">{reminderMemories.length}</span>
                )}

                {item.label === "Ulubione" && favoriteMemories.length > 0 && (
                  <span className="nav-count">{favoriteMemories.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-label">TWOJA PRZESTRZEŃ</div>

        <button
          className={`nav-item ${activePage === "Kopie zapasowe" ? "active" : ""}`}
          onClick={() => setActivePage("Kopie zapasowe")}
        >
          <Cloud size={19} strokeWidth={1.8} />
          <span>Kopie zapasowe</span>
        </button>

        <div className="sidebar-bottom">
          <button className="storage-card" onClick={() => setActivePage("Kopie zapasowe")}>
            <div className="storage-heading">
              <span>Twoja przestrzeń</span>
              <Cloud size={16} />
            </div>

            <div className="storage-bar">
              <span style={{ width: `${storagePercent}%` }} />
            </div>

            <div className="storage-caption">
              <span>{(storageBytes / (1024 * 1024)).toFixed(2)} MB · szacunek</span>
              <span>{Math.round(storagePercent)}%</span>
            </div>
          </button>

          <button className="profile-button" onClick={() => setActivePage("Kopie zapasowe")}>
            <div className="avatar"><Cloud size={16} /></div>

            <div className="profile-info">
              <strong>Kopie zapasowe</strong>
              <span>Eksport i import danych</span>
            </div>

            <ChevronRight size={17} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Moja przestrzeń <ChevronRight size={15} />
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button search-button"
              aria-label="Szukaj we wspomnieniach"
              aria-expanded={showGlobalSearch}
              onClick={() => {
                setShowGlobalSearch(current => !current);
                setShowNotifications(false);
              }}
            >
              <Search size={19} />
            </button>

            <button
              className="icon-button notification-button"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Powiadomienia"
            >
              <Bell size={19} />
              {reminderMemories.length > 0 && <span className="notification-dot" />}
            </button>

            <div className="topbar-divider" />

            <button className="topbar-profile" onClick={() => setActivePage("Kopie zapasowe")} aria-label="Otwórz kopie zapasowe">
              <div className="avatar small"><Cloud size={15} /></div>
              <ChevronDown size={15} />
            </button>

            <AnimatePresence>
              {showGlobalSearch && (
                <motion.div className="global-search-popover" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="timeline-search"><Search size={17} /><input autoFocus value={globalQuery} onChange={event => setGlobalQuery(event.target.value)} placeholder="Tytuł, tag, osoba lub miejsce..." /><button onClick={() => { setShowGlobalSearch(false); setGlobalQuery(""); }} aria-label="Zamknij wyszukiwanie"><X size={16} /></button></div>
                  {globalQuery.trim() && (
                    <div className="global-search-results">
                      {matchingMemories.length ? matchingMemories.map(memory => (
                        <button key={memory.id} onClick={() => { setSelectedMemory(memory); setShowGlobalSearch(false); }}>
                          <strong>{memory.title}</strong><span>{formatDate(memory.date)} · {memory.type}</span>
                        </button>
                      )) : <p>Nie znaleziono wspomnień.</p>}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="notification-popover"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <strong>Przypomnienia</strong>
                  {reminderMemories.length ? reminderMemories.slice(0, 4).map(memory => (
                    <button className="notification-reminder" key={memory.id} onClick={() => { setSelectedMemory(memory); setShowNotifications(false); }}>
                      <span>{memory.title}</span><small>{formatDate(memory.reminderDate)}</small>
                    </button>
                  )) : <p>Nie masz zaplanowanych przypomnień.</p>}
                  {reminderMemories.length > 0 && <button className="notification-all" onClick={() => { setActivePage("Przypomnienia"); setShowNotifications(false); }}>Zobacz wszystkie</button>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className={`page-container ${pageMode}`}>
          {activePage === "Oś czasu" && (
            <TimelineView
              memories={memories}
              onOpenMemory={setSelectedMemory}
            />
          )}

          {activePage === "Kolekcje" && (
            <CollectionsView
              collections={collections}
              setCollections={setCollections}
              memories={memories}
              onToast={showToast}
            />
          )}

          {activePage === "Ulubione" && (
            <TimelineView
              memories={favoriteMemories}
              onOpenMemory={setSelectedMemory}
              heading="Ulubione"
              eyebrowText="NAJWAŻNIEJSZE CHWILE"
              subtitle="Wspomnienia, do których chcesz wracać najczęściej."
              emptyTitle="Nie masz jeszcze ulubionych"
              emptyText="Kliknij gwiazdkę na wspomnieniu, aby dodać je tutaj."
            />
          )}

          {activePage === "Kapsuły czasu" && (
            <CapsulesView
              capsules={capsules}
              setCapsules={setCapsules}
              memories={memories}
              onOpenMemory={setSelectedMemory}
              onToast={showToast}
            />
          )}

          {activePage === "Przypomnienia" && (
            <RemindersView
              memories={memories}
              onOpenMemory={setSelectedMemory}
              onAddMemory={() => setShowModal(true)}
            />
          )}

          {activePage === "Kopie zapasowe" && (
            <BackupView
              storageBytes={storageBytes}
              onExport={exportBackup}
              onImport={importBackup}
            />
          )}

          {activePage === "Przegląd" && (
            <>
              <motion.section
                className="welcome-section"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div>
                  <div className="eyebrow">
                    <Sparkles size={14} /> TWOJE MIEJSCE NA WSPOMNIENIA
                  </div>

                  <h1>
                    Każda chwila<br />
                    ma swoją historię<span>.</span>
                  </h1>

                  <p>
                    Witaj z powrotem. Twoje najważniejsze momenty są zawsze blisko.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => setShowModal(true)}
                >
                  <Plus size={18} /> Dodaj wspomnienie
                </button>
              </motion.section>

              <motion.section
                className="stats-grid"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <Images size={19} />
                  </div>

                  <div className="stat-label">Wszystkie wspomnienia</div>
                  <div className="stat-value">{memories.length}</div>
                  <div className="stat-note">Twoja osobista historia</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon violet">
                    <CalendarDays size={19} />
                  </div>

                  <div className="stat-label">Ten miesiąc</div>

                  <div className="stat-value">
                    {thisMonthCount}
                  </div>

                  <div className="stat-note">Dodanych przez Ciebie</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon amber">
                    <LockKeyhole size={19} />
                  </div>

                  <div className="stat-label">Kapsuły czasu</div>
                  <div className="stat-value">{capsules.length}</div>
                  <div className="stat-note">Zapisanych kapsuł czasu</div>
                </div>
              </motion.section>

              <motion.section
                className="featured-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="featured-content">
                  <div className="featured-tag">
                    <Sparkles size={13} /> MAŁA PRZYPOMINAJKA
                  </div>

                  <h2>
                    Niektóre chwile<br />
                    warto przeżyć dwa razy.
                  </h2>

                  <p>
                    Zatrzymaj to, co ważne. Wróć do wspomnień, które sprawiają,
                    że się uśmiechasz.
                  </p>

                  <button
                    className="text-button"
                    onClick={() => setActivePage("Oś czasu")}
                  >
                    Odkryj swoje wspomnienia <ChevronRight size={16} />
                  </button>
                </div>

                <div className="featured-art">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-core">
                    <Aperture size={52} strokeWidth={1.1} />
                  </div>
                  <div className="art-spark spark-one">✳</div>
                  <div className="art-spark spark-two">✦</div>
                </div>
              </motion.section>

              <section className="section-heading">
                <div>
                  <div className="section-kicker">TWOJA HISTORIA</div>
                  <h2>Ostatnie wspomnienia</h2>
                </div>

                <button
                  className="view-all"
                  onClick={() => setActivePage("Oś czasu")}
                >
                  Zobacz wszystkie <ChevronRight size={16} />
                </button>
              </section>

              <div className="memory-grid">
                {memories.map((memory, index) => (
                  <motion.article
                    className="memory-card"
                    key={memory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.06 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedMemory(memory)}
                    style={{ cursor: "pointer" }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={event => {
                      // Ignoruj klawisze z przycisków wewnątrz karty (np. kosza).
                      if (event.target !== event.currentTarget) return;

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedMemory(memory);
                      }
                    }}
                  >
                    <div
                      className={`memory-cover ${memory.color}`}
                      style={memory.image ? {
                        backgroundImage: `url(${memory.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                      } : {}}
                    >
                      {!memory.image && <div className="cover-decoration" />}

                      <div className="memory-type">
                        {memory.type === "Nagranie" ? (
                          <Mic2 size={13} />
                        ) : (
                          <Images size={13} />
                        )}

                        {memory.type}
                      </div>

                      {/* Kosz dostępny dla WSZYSTKICH wspomnień */}
                      <button
                        className="memory-more"
                        onClick={event => {
                          event.stopPropagation();
                          requestDelete(memory);
                        }}
                        title="Usuń wspomnienie"
                        aria-label={`Usuń wspomnienie ${memory.title}`}
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        className={`memory-fav ${memory.favorite ? "active" : ""}`}
                        onClick={event => {
                          event.stopPropagation();
                          toggleFavorite(memory.id);
                        }}
                        title={memory.favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                        aria-label={memory.favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                        aria-pressed={!!memory.favorite}
                      >
                        <Star size={16} fill={memory.favorite ? "currentColor" : "none"} />
                      </button>

                      {!memory.custom && memory.color === "sea" && (
                        <div className="cover-caption">SUMMER / 26</div>
                      )}

                      {!memory.custom && memory.color === "sunset" && (
                        <div className="sunset-circle" />
                      )}

                      {!memory.custom && memory.color === "voice" && (
                        <div className="voice-wave">
                          {Array.from({ length: 27 }).map((_, i) => (
                            <span
                              key={i}
                              style={{ height: `${12 + ((i * 17) % 35)}px` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="memory-details">
                      <div className="memory-date">
                        {formatDate(memory.date)}
                      </div>

                      <h3>{memory.title}</h3>

                      {(memory.tags?.length > 0 || memory.place) && (
                        <div className="memory-card-meta">
                          {memory.tags?.slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}
                          {memory.place && <span><MapPin size={11} /> {memory.place}</span>}
                        </div>
                      )}

                      <div className="memory-footer">
                        <span>{memory.count}</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              {memories.length === 0 && (
                <div className="empty-memories">
                  <Images size={30} />
                  <h3>Twoja historia dopiero się zaczyna</h3>
                  <p>
                    Dodaj pierwsze wspomnienie, aby zachować ważną chwilę.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => setShowModal(true)}
                  >
                    <Plus size={17} /> Dodaj wspomnienie
                  </button>
                </div>
              )}

              <section className="bottom-quote">
                <div className="quote-mark">“</div>
                <p>Życie składa się z chwil. Nie pozwól im zniknąć.</p>
                <span>MOMENT — YOUR LIFE. YOUR MOMENTS. YOUR STORY.</span>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Dodawanie wspomnienia */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={event => {
              if (event.target === event.currentTarget) {
                setShowModal(false);
              }
            }}
          >
            <motion.div
              className="memory-modal"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="modal-header">
                <div>
                  <div className="modal-eyebrow">ZACHOWAJ CHWILĘ</div>
                  <h2>Nowe wspomnienie</h2>
                  <p>Każda historia zasługuje na swoje miejsce.</p>
                </div>

                <button
                  className="modal-close"
                  onClick={() => setShowModal(false)}
                  aria-label="Zamknij"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={addMemory}>
                <label className="field-label" htmlFor="memory-title">
                  Tytuł wspomnienia
                </label>

                <input
                  id="memory-title"
                  name="title"
                  className="form-input"
                  placeholder="Jak nazwiesz tę chwilę?"
                  value={form.title}
                  onChange={updateForm}
                  maxLength={80}
                  required
                />

                <div className="form-row">
                  <div>
                    <label className="field-label" htmlFor="memory-date">
                      Data
                    </label>

                    <input
                      id="memory-date"
                      name="date"
                      type="date"
                      className="form-input"
                      value={form.date}
                      onChange={updateForm}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="memory-type">
                      Rodzaj
                    </label>

                    <select
                      id="memory-type"
                      name="type"
                      className="form-input"
                      value={form.type}
                      onChange={updateForm}
                    >
                      <option>Zdjęcie</option>
                      <option>Notatka</option>
                      <option>Nagranie</option>
                      <option>Wideo</option>
                      <option>Wydarzenie</option>
                    </select>
                  </div>
                </div>

                <label className="field-label" htmlFor="memory-description">
                  Opis
                </label>

                <textarea
                  id="memory-description"
                  name="description"
                  className="form-input form-textarea"
                  placeholder="Zapisz, co chcesz zapamiętać..."
                  value={form.description}
                  onChange={updateForm}
                  maxLength={1000}
                  rows={4}
                />

                <label className="field-label" htmlFor="memory-tags">Tagi</label>
                <input
                  id="memory-tags"
                  name="tags"
                  className="form-input"
                  placeholder="np. wakacje, rodzina"
                  value={form.tags}
                  onChange={updateForm}
                />

                <label className="field-label" htmlFor="memory-people">Osoby</label>
                <input
                  id="memory-people"
                  name="people"
                  className="form-input"
                  placeholder="Imiona oddzielone przecinkami"
                  value={form.people}
                  onChange={updateForm}
                />

                <label className="field-label" htmlFor="memory-place">Miejsce</label>
                <input
                  id="memory-place"
                  name="place"
                  className="form-input"
                  placeholder="Gdzie wydarzyła się ta chwila?"
                  value={form.place}
                  onChange={updateForm}
                />

                <label className="field-label" htmlFor="memory-reminder">Przypomnij mi</label>
                <input
                  id="memory-reminder"
                  name="reminderDate"
                  type="date"
                  className="form-input"
                  value={form.reminderDate}
                  onChange={updateForm}
                />

                <label className="field-label">Zdjęcie</label>

                <label className="upload-area">
                  {image ? (
                    <div className="upload-preview">
                      <img
                        src={image}
                        alt="Podgląd wybranego zdjęcia"
                      />

                      <span>{imageName}</span>

                      <button
                        type="button"
                        className="remove-image"
                        onClick={event => {
                          event.preventDefault();
                          setImage("");
                          setImageName("");
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <Upload size={20} />
                      </div>

                      <strong>Wybierz zdjęcie</strong>
                      <span>JPG, PNG lub WEBP · maksymalnie 5 MB</span>
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    hidden
                  />
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowModal(false)}
                  >
                    Anuluj
                  </button>

                  <button type="submit" className="primary-button">
                    <Plus size={17} /> Zapisz wspomnienie
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Szczegóły wspomnienia */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDetails
            key={selectedMemory.id}
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
            onSave={saveMemory}
            onRequestDelete={requestDelete}
            onToggleFavorite={toggleFavorite}
            onNotify={showToast}
          />
        )}
      </AnimatePresence>

      {/* Potwierdzenie usunięcia wspomnienia */}
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDialog
            title="Usunąć to wspomnienie?"
            message={`„${pendingDelete.title}” zniknie z osi czasu i ze wszystkich kolekcji. Przez chwilę będziesz mógł cofnąć usunięcie.`}
            confirmLabel="Usuń wspomnienie"
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingBackup && (
          <ConfirmDialog
            title="Przywrócić kopię zapasową?"
            message={`Bieżące dane zostaną zastąpione. Kopia zawiera ${pendingBackup.memories.length} wspomnień, ${pendingBackup.collections.length} kolekcji i ${pendingBackup.capsules.length} kapsuł.`}
            confirmLabel="Przywróć dane"
            onConfirm={restoreBackup}
            onCancel={() => setPendingBackup(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast z opcją cofnięcia */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
          >
            <span>{toast.message}</span>

            {toast.undo && (
              <button
                className="toast-undo"
                onClick={() => {
                  toast.undo();
                  dismissToast();
                }}
              >
                <Undo2 size={14} /> Cofnij
              </button>
            )}

            <button
              className="toast-close"
              onClick={dismissToast}
              aria-label="Zamknij powiadomienie"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;