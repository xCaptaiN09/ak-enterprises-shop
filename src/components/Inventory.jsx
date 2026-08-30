import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Trash2,
  Package,
  Pencil,
  Search,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { toast } from "../utils/toast";

export default function Inventory({ isAdmin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [expandedId, setExpandedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteText, setDeleteText] = useState("");

  const [form, setForm] = useState({
    brand: "",
    model: "",
    type: "Car",
    price: "",
    hsn_code: "85071000",
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const openNewForm = () => {
    setEditingItem(null);
    setForm({
      brand: "",
      model: "",
      type: "Car",
      price: "",
      hsn_code: "85071000",
    });
    setShowForm(true);
  };
  const openEditForm = (item) => {
    setEditingItem(item);
    setForm({
      brand: item.brand,
      model: item.model,
      type: item.type,
      price: item.price || "",
      hsn_code: item.hsn_code || "85071000",
    });
    setShowForm(true);
    setExpandedId(null);
  };
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: form.price ? parseFloat(form.price) : null,
    };
    if (editingItem) {
      const { error } = await supabase
        .from("inventory")
        .update(payload)
        .eq("id", editingItem.id);
      if (error) return toast("Error updating: " + error.message);
    } else {
      const { error } = await supabase.from("inventory").insert([payload]);
      if (error) return toast("Error saving: " + error.message);
    }
    setShowForm(false);
    fetchInventory();
  };

  const handleDelete = async (id) => {
    await supabase.from("inventory").delete().eq("id", id);
    setDeleteConfirmId(null);
    setDeleteText("");
    setExpandedId(null);
    fetchInventory();
  };

  const displayedItems = useMemo(() => {
    let filtered = items.filter(
      (item) =>
        item.brand.toLowerCase().includes(search.toLowerCase()) ||
        item.model.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase()),
    );

    if (sort === "price-high")
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === "price-low")
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === "newest")
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === "oldest")
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return filtered;
  }, [items, search, sort]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter mb-2 text-zinc-900 dark:text-white">
            Inventory
          </h2>
          <p className="text-base text-zinc-500 dark:text-zinc-500 font-medium">
            Add and manage available battery stock & pricing.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openNewForm}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-black px-5 py-3 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Battery
        </motion.button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search brand, model, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="premium-input w-full rounded-xl pl-11 pr-4 py-3 outline-none transition-colors text-sm"
          />
        </div>
        <div className="relative sm:w-auto">
          <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="premium-input w-full sm:w-auto rounded-xl pl-11 pr-8 py-3 outline-none transition-colors text-sm appearance-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-high">Price: High to Low</option>
            <option value="price-low">Price: Low to High</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            Loading...
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 md:p-14 mx-auto w-full max-w-xl flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-700/60 flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              No batteries in stock
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mb-5">
              Add your first battery to start tracking stock and pricing.
            </p>
            <button
              onClick={openNewForm}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Add Battery
            </button>
          </div>
        ) : (
          displayedItems.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <div
                onClick={() =>
                  setExpandedId(expandedId === item.id ? null : item.id)
                }
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Package className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-zinc-900 dark:text-white font-bold">
                      {item.brand} {item.model}
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-500 text-xs font-mono">
                      {item.type} • ₹{item.price || "-"}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedId === item.id ? 180 : 0 }}
                >
                  <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                </motion.div>
              </div>

              <AnimatePresence>
                {expandedId === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Brand
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {item.brand}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Model
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {item.model}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Type
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {item.type}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Base Price
                          </span>
                          <span className="text-zinc-900 dark:text-white font-mono">
                            ₹{item.price || "-"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            HSN Code
                          </span>
                          <span className="text-zinc-900 dark:text-white font-mono">
                            {item.hsn_code || "-"}
                          </span>
                        </div>
                      </div>

                      {deleteConfirmId === item.id ? (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                          <p className="text-red-500 dark:text-red-400 text-sm mb-2 font-medium">
                            Type DELETE to confirm
                          </p>
                          <input
                            autoFocus
                            value={deleteText}
                            onChange={(e) =>
                              setDeleteText(e.target.value.toUpperCase())
                            }
                            className="premium-input w-full rounded-lg px-3 py-2 mb-2 outline-none"
                            placeholder="DELETE"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                deleteText === "DELETE"
                                  ? handleDelete(item.id)
                                  : toast("Text doesn't match")
                              }
                              className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirmId(null);
                                setDeleteText("");
                              }}
                              className="px-4 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white py-2 rounded-lg text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditForm(item)}
                            className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white py-2 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="px-4 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 dark:text-red-400 py-2 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-3xl p-5 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {editingItem ? "Edit Battery" : "Add New Battery"}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                    Brand
                  </label>
                  <input
                    required
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                    className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                    placeholder="e.g. Exide"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                    Model
                  </label>
                  <input
                    required
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                    placeholder="e.g. DIN55"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Type
                    </label>
                    <input
                      list="battery-types"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="Select or type"
                    />
                    <datalist id="battery-types">
                      <option value="Car" />
                      <option value="Bike" />
                      <option value="Truck" />
                      <option value="Auto-rickshaw" />
                      <option value="Bus" />
                      <option value="Inverter" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Base Price (₹)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono"
                      placeholder="6500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                    HSN Code
                  </label>
                  <input
                    name="hsn_code"
                    value={form.hsn_code}
                    onChange={handleChange}
                    className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono"
                    placeholder="85071000"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-6 hover:bg-indigo-500 transition-colors"
                >
                  {editingItem ? "Update Battery" : "Save Battery"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
