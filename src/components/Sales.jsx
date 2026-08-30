import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Trash2,
  Pencil,
  Search,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Battery,
  MapPin,
  Download,
} from "lucide-react";
import MapPicker from "./MapPicker";
import { generateInvoice } from "../utils/generateInvoice";

export default function Sales({ isAdmin }) {
  const [records, setRecords] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [shopSettings, setShopSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filterBrand, setFilterBrand] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteText, setDeleteText] = useState("");

  const emptyForm = {
    customer_name: "",
    phone: "",
    vehicle_number: "",
    vehicle_type: "Car",
    battery_brand: "",
    battery_model: "",
    serial_number: "",
    hsn_code: "85071000",
    mrp: "",
    discount: "",
    discount_type: "flat",
    warranty_months: "12",
    sale_date: new Date().toISOString().split("T")[0],
    sale_time: new Date().toTimeString().split(" ")[0],
    customer_gstin: "",
    customer_state: "",
    customer_address: "",
    map_coordinates: "",
    image_urls: [],
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchSales();
    fetchInventory();
    fetchSettings();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from("inventory").select("*");
    if (data) setInventory(data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (data) setShopSettings(data);
  };

  const openNewForm = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEditForm = (item) => {
    setEditingItem(item);
    setForm(item);
    setShowForm(true);
    setExpandedId(null);
  };
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const uploadedUrls = [...(form.image_urls || [])];
    for (const file of files) {
      if (uploadedUrls.length >= 4) {
        alert("Maximum 4 photos allowed.");
        break;
      }
      const fileName = `sale_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("battery-images")
        .upload(fileName, file);
      if (error) {
        alert("Error uploading image: " + error.message);
      } else {
        const { data } = supabase.storage
          .from("battery-images")
          .getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }
    }
    setForm({ ...form, image_urls: uploadedUrls });
  };

  const handleRemoveImage = (urlToRemove) =>
    setForm({
      ...form,
      image_urls: form.image_urls.filter((url) => url !== urlToRemove),
    });

  const handleInventorySelect = (id) => {
    const item = inventory.find((i) => i.id === id);
    if (item)
      setForm({
        ...form,
        battery_brand: item.brand,
        battery_model: item.model,
        mrp: item.price || "",
        hsn_code: item.hsn_code || "85071000",
      });
  };

  const handleMapConfirm = (location) => {
    setForm((prev) => ({
      ...prev,
      customer_address: location.address,
      map_coordinates: location.coordinates,
    }));
    setShowMap(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check serial number uniqueness (skip if blank or editing the same record)
    if (form.serial_number && form.serial_number.trim()) {
      const { data: existing } = await supabase
        .from("sales")
        .select("id")
        .eq("serial_number", form.serial_number.trim())
        .neq("id", editingItem?.id || "00000000-0000-0000-0000-000000000000")
        .limit(1);
      if (existing && existing.length > 0) {
        alert(
          "Serial number already used in another sale. Each battery must have a unique serial number.",
        );
        return;
      }
    }

    const mrp = parseFloat(form.mrp) || 0;
    const discountVal = parseFloat(form.discount) || 0;
    const discountAmount =
      form.discount_type === "percent"
        ? mrp * (discountVal / 100)
        : discountVal;
    const finalPrice = mrp - discountAmount;
    const payload = {
      ...form,
      mrp: mrp,
      discount: discountVal,
      price: finalPrice,
      warranty_months: form.warranty_months
        ? parseInt(form.warranty_months)
        : null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("sales")
        .update(payload)
        .eq("id", editingItem.id);
      if (error) return alert("Error updating: " + error.message);
    } else {
      const { error } = await supabase.from("sales").insert([payload]);
      if (error) return alert("Error saving: " + error.message);
    }
    setShowForm(false);
    fetchSales();
  };

  const handleDelete = async (id) => {
    await supabase.from("sales").delete().eq("id", id);
    setDeleteConfirmId(null);
    setDeleteText("");
    setExpandedId(null);
    fetchSales();
  };

  const calculateExpiry = (date, months) => {
    if (!date || !months) return "-";
    const d = new Date(date);
    d.setMonth(d.getMonth() + parseInt(months));
    return d.toLocaleDateString();
  };

  const liveMrp = parseFloat(form.mrp) || 0;
  const liveDiscountVal = parseFloat(form.discount) || 0;
  const liveDiscountAmount =
    form.discount_type === "percent"
      ? liveMrp * (liveDiscountVal / 100)
      : liveDiscountVal;
  const liveFinalPrice = liveMrp - liveDiscountAmount;

  const uniqueBrands = useMemo(
    () => [
      "all",
      ...new Set(records.map((r) => r.battery_brand).filter(Boolean)),
    ],
    [records],
  );

  const displayedRecords = useMemo(() => {
    let filtered = records.filter(
      (item) =>
        (filterBrand === "all" || item.battery_brand === filterBrand) &&
        (item.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
          item.phone?.toLowerCase().includes(search.toLowerCase()) ||
          item.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
          item.battery_brand?.toLowerCase().includes(search.toLowerCase()) ||
          item.battery_model?.toLowerCase().includes(search.toLowerCase()) ||
          `INV-${item.id?.substring(0, 8).toUpperCase()}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    );

    if (sort === "price-high")
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === "price-low")
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === "newest")
      filtered.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
    if (sort === "oldest")
      filtered.sort((a, b) => new Date(a.sale_date) - new Date(b.sale_date));

    return filtered;
  }, [records, search, sort, filterBrand]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter mb-2 text-zinc-900 dark:text-white">
            Sales
          </h2>
          <p className="text-base text-zinc-500 dark:text-zinc-500 font-medium">
            Track all batteries sold to customers.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openNewForm}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-black px-5 py-3 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New Sale
        </motion.button>
      </div>

      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search name, phone, vehicle, battery..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="premium-input w-full rounded-xl pl-11 pr-4 py-3 outline-none transition-colors text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="premium-input w-full sm:w-auto rounded-xl pl-11 pr-8 py-3 outline-none transition-colors text-sm appearance-none cursor-pointer capitalize"
            >
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand} className="capitalize">
                  {brand === "all" ? "All Brands" : brand}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
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
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            Loading...
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 md:p-14 mx-auto w-full max-w-xl flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-700/60 flex items-center justify-center mb-4">
              <Battery className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              No sales yet
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mb-5">
              Record your first sale and it will appear here.
            </p>
            <button
              onClick={openNewForm}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> New Sale
            </button>
          </div>
        ) : (
          displayedRecords.map((sale) => (
            <div
              key={sale.id}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <div
                onClick={() =>
                  setExpandedId(expandedId === sale.id ? null : sale.id)
                }
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Battery className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-zinc-900 dark:text-white font-bold">
                      {sale.customer_name}{" "}
                      <span className="text-zinc-500 dark:text-zinc-500 font-normal text-xs">
                        ({sale.phone})
                      </span>
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-500 text-xs font-mono">
                      {sale.battery_brand} {sale.battery_model} • ₹
                      {sale.price || "-"} •{" "}
                      {sale.vehicle_number || "No Vehicle"}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedId === sale.id ? 180 : 0 }}
                >
                  <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                </motion.div>
              </div>

              <AnimatePresence>
                {expandedId === sale.id && (
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
                            Vehicle
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {sale.vehicle_type || "-"} (
                            {sale.vehicle_number || "-"})
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Serial Number
                          </span>
                          <span className="text-zinc-900 dark:text-white font-mono">
                            {sale.serial_number || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            HSN Code
                          </span>
                          <span className="text-zinc-900 dark:text-white font-mono">
                            {sale.hsn_code || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Warranty
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {sale.warranty_months
                              ? `${sale.warranty_months} Months`
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Date & Time
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {sale.sale_date
                              ? new Date(sale.sale_date).toLocaleDateString()
                              : "-"}{" "}
                            {sale.sale_time || ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Warranty Until
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {calculateExpiry(
                              sale.sale_date,
                              sale.warranty_months,
                            )}
                          </span>
                        </div>
                        <div className="col-span-2 grid grid-cols-3 gap-2 mt-2 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                          <div>
                            <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                              MRP
                            </span>
                            <span className="text-zinc-900 dark:text-white font-mono">
                              ₹{sale.mrp || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                              Discount
                            </span>
                            <span className="text-red-500 dark:text-red-400 font-mono">
                              - ₹
                              {sale.discount_type === "percent"
                                ? `${sale.discount}%`
                                : sale.discount || "0"}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                              Final Price
                            </span>
                            <span className="text-green-500 dark:text-green-400 font-mono">
                              ₹{sale.price || "-"}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            GSTIN
                          </span>
                          <span className="text-zinc-900 dark:text-white font-mono">
                            {sale.customer_gstin || "-"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                            Address
                          </span>
                          <span className="text-zinc-900 dark:text-white">
                            {sale.customer_address || "-"}{" "}
                            {sale.map_coordinates ? (
                              <a
                                href={`https://maps.google.com/?q=${sale.map_coordinates}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-500 dark:text-indigo-400 underline"
                              >
                                (View Map)
                              </a>
                            ) : (
                              ""
                            )}
                          </span>
                        </div>
                      </div>

                      {sale.image_urls?.length > 0 && (
                        <div className="mb-4">
                          <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-2">
                            Attached Photos
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {sale.image_urls.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={url}
                                  alt={`Upload ${idx}`}
                                  className="w-16 h-16 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800 hover:opacity-80"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {deleteConfirmId === sale.id ? (
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
                                  ? handleDelete(sale.id)
                                  : alert("Text doesn't match")
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
                        <div className="flex flex-col md:flex-row gap-2">
                          <button
                            onClick={() => generateInvoice(sale, shopSettings)}
                            className="flex-1 flex items-center justify-center gap-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 py-2 rounded-lg text-sm hover:bg-indigo-500/20 transition-colors"
                          >
                            <Download className="w-4 h-4" /> Download Invoice
                          </button>
                          <button
                            onClick={() => openEditForm(sale)}
                            className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white py-2 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirmId(sale.id)}
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
              className="glass-card rounded-3xl p-5 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {editingItem ? "Edit Sale" : "Record New Sale"}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Customer Name
                    </label>
                    <input
                      required
                      name="customer_name"
                      value={form.customer_name || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Phone
                    </label>
                    <input
                      required
                      name="phone"
                      value={form.phone || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      GSTIN (Optional)
                    </label>
                    <input
                      name="customer_gstin"
                      value={form.customer_gstin || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono"
                      placeholder="32AAWPE2153N1ZH"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      State
                    </label>
                    <input
                      name="customer_state"
                      value={form.customer_state || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="Kerala"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                    Address & Location
                  </label>
                  <div className="flex gap-2">
                    <input
                      name="customer_address"
                      value={form.customer_address || ""}
                      onChange={handleChange}
                      className="premium-input flex-1 rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="Enter manually or use map"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-4 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <MapPin className="w-4 h-4" /> Map
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Vehicle Number
                    </label>
                    <input
                      name="vehicle_number"
                      value={form.vehicle_number || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="KA01AB1234"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Vehicle Type
                    </label>
                    <input
                      list="vehicle-types"
                      name="vehicle_type"
                      value={form.vehicle_type || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="Select or type"
                    />
                    <datalist id="vehicle-types">
                      <option value="Car" />
                      <option value="Bike" />
                      <option value="Truck" />
                      <option value="Auto-rickshaw" />
                      <option value="Bus" />
                      <option value="Inverter" />
                    </datalist>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                    Select from Inventory (Optional)
                  </label>
                  <select
                    onChange={(e) =>
                      e.target.value
                        ? handleInventorySelect(e.target.value)
                        : null
                    }
                    className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                  >
                    <option value="">Manual Entry / None</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.brand} - {item.model} (₹{item.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Battery Brand
                    </label>
                    <input
                      required
                      name="battery_brand"
                      value={form.battery_brand || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="Exide"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Model
                    </label>
                    <input
                      required
                      name="battery_model"
                      value={form.battery_model || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                      placeholder="DIN55"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Serial Number
                    </label>
                    <input
                      name="serial_number"
                      value={form.serial_number || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono"
                      placeholder="SN12345"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      HSN Code
                    </label>
                    <input
                      name="hsn_code"
                      value={form.hsn_code || ""}
                      onChange={handleChange}
                      readOnly={!isAdmin}
                      className={`premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                      placeholder="85071000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      MRP / Base Rate (₹)
                    </label>
                    <input
                      type="number"
                      name="mrp"
                      value={form.mrp || ""}
                      onChange={handleChange}
                      readOnly={!isAdmin}
                      className={`premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Discount
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        name="discount"
                        value={form.discount || ""}
                        onChange={handleChange}
                        readOnly={!isAdmin}
                        className={`premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                        placeholder="0"
                      />
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, discount_type: "flat" })
                          }
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${form.discount_type === "flat" ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-500"}`}
                        >
                          ₹
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, discount_type: "percent" })
                          }
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${form.discount_type === "percent" ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-500"}`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                    Final Price (Incl. GST)
                  </span>
                  <span className="text-lg font-bold text-green-500 dark:text-green-400 font-mono">
                    ₹{liveFinalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Warranty
                    </label>
                    <input
                      type="number"
                      name="warranty_months"
                      value={form.warranty_months || ""}
                      onChange={handleChange}
                      readOnly={!isAdmin}
                      className={`premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Sale Date
                    </label>
                    <input
                      type="date"
                      name="sale_date"
                      value={form.sale_date || ""}
                      onChange={handleChange}
                      readOnly={!isAdmin}
                      className={`premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Time
                    </label>
                    <input
                      type="time"
                      name="sale_time"
                      value={form.sale_time || ""}
                      onChange={handleChange}
                      className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                    Upload Photos (Max 4)
                  </label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {(form.image_urls || []).map((url, idx) => (
                      <div key={idx} className="relative w-24 h-24 group">
                        <img
                          src={url}
                          alt={`Upload ${idx}`}
                          className="w-full h-full object-cover rounded-lg border border-zinc-200 dark:border-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(url)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(form.image_urls?.length || 0) < 4 && (
                      <label className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-zinc-400 dark:text-zinc-500 text-xs text-center px-2 font-medium">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        + Add Photo
                      </label>
                    )}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-6 hover:bg-indigo-500 transition-colors"
                >
                  {editingItem ? "Update Sale" : "Save Sale"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMap && (
          <MapPicker
            onConfirm={handleMapConfirm}
            onClose={() => setShowMap(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
