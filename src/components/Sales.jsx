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
    discount: "",
    discount_type: "flat",
    sale_date: new Date().toISOString().split("T")[0],
    sale_time: new Date().toTimeString().split(" ")[0],
    customer_gstin: "",
    customer_state: "",
    customer_address: "",
    map_coordinates: "",
    image_urls: [],
  };
  const [form, setForm] = useState(emptyForm);

  const emptyItem = {
    brand: "",
    model: "",
    serial: "",
    hsn: "85071000",
    mrp: "",
    qty: 1,
    vehicle_type: "Car",
    vehicle_number: "",
    warranty: "12",
  };
  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    fetchSales();
    fetchInventory();
    fetchSettings();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    const { data: salesData } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: itemsData } = await supabase.from("sale_items").select("*");

    const itemsMap = {};
    if (itemsData) {
      itemsData.forEach((item) => {
        if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = [];
        itemsMap[item.sale_id].push(item);
      });
    }

    const enriched = (salesData || []).map((sale) => ({
      ...sale,
      items: itemsMap[sale.id] || [],
    }));

    setRecords(enriched);
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
    setItems([{ ...emptyItem }]);
    setShowForm(true);
  };

  const openEditForm = (sale) => {
    setEditingItem(sale);
    if (sale.items && sale.items.length > 0) {
      setItems(
        sale.items.map((i) => ({
          brand: i.battery_brand || "",
          model: i.battery_model || "",
          serial: i.serial_number || "",
          hsn: i.hsn_code || "85071000",
          mrp: i.mrp || "",
          qty: i.quantity || 1,
          vehicle_type: i.vehicle_type || "Car",
          vehicle_number: i.vehicle_number || "",
          warranty:
            i.warranty_months != null ? String(i.warranty_months) : "12",
        })),
      );
    } else {
      setItems([
        {
          brand: sale.battery_brand || "",
          model: sale.battery_model || "",
          serial: sale.serial_number || "",
          hsn: sale.hsn_code || "85071000",
          mrp: sale.mrp || "",
          qty: 1,
          vehicle_type: sale.vehicle_type || "Car",
          vehicle_number: sale.vehicle_number || "",
          warranty:
            sale.warranty_months != null ? String(sale.warranty_months) : "12",
        },
      ]);
    }
    setForm({
      customer_name: sale.customer_name || "",
      phone: sale.phone || "",
      discount: sale.discount || "",
      discount_type: sale.discount_type || "flat",
      sale_date: sale.sale_date || "",
      sale_time: sale.sale_time || "",
      customer_gstin: sale.customer_gstin || "",
      customer_state: sale.customer_state || "",
      customer_address: sale.customer_address || "",
      map_coordinates: sale.map_coordinates || "",
      image_urls: sale.image_urls || [],
    });
    setShowForm(true);
    setExpandedId(null);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };
  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;
    setItems(updated);
  };

  const handleInventorySelect = (id) => {
    const inv = inventory.find((i) => i.id === id);
    if (!inv) return;
    const newItem = {
      ...emptyItem,
      brand: inv.brand,
      model: inv.model,
      mrp: inv.price || "",
      hsn: inv.hsn_code || "85071000",
    };
    const emptyIdx = items.findIndex((i) => !i.brand);
    if (emptyIdx >= 0) {
      const updated = [...items];
      updated[emptyIdx] = newItem;
      setItems(updated);
    } else {
      setItems([...items, newItem]);
    }
  };

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

    const validItems = items.filter((i) => i.brand && i.model);
    if (validItems.length === 0) {
      alert("Add at least one battery (brand and model required).");
      return;
    }

    for (const item of validItems) {
      if (item.serial && item.serial.trim()) {
        const serial = item.serial.trim();
        const { data: inSales } = await supabase
          .from("sales")
          .select("id")
          .eq("serial_number", serial)
          .neq("id", editingItem?.id || "00000000-0000-0000-0000-000000000000")
          .limit(1);
        if (inSales && inSales.length > 0) {
          alert(`Serial ${serial} already used in another sale.`);
          return;
        }
        const { data: inItems } = await supabase
          .from("sale_items")
          .select("sale_id")
          .eq("serial_number", serial)
          .neq(
            "sale_id",
            editingItem?.id || "00000000-0000-0000-0000-000000000000",
          )
          .limit(1);
        if (inItems && inItems.length > 0) {
          alert(`Serial ${serial} already used in another sale.`);
          return;
        }
      }
    }

    const subtotal = validItems.reduce(
      (sum, i) => sum + (parseFloat(i.mrp) || 0) * (parseInt(i.qty) || 1),
      0,
    );
    const discountVal = parseFloat(form.discount) || 0;
    const discountAmount =
      form.discount_type === "percent"
        ? subtotal * (discountVal / 100)
        : discountVal;
    const finalPrice = subtotal - discountAmount;

    const payload = {
      ...form,
      mrp: subtotal,
      discount: discountVal,
      price: finalPrice,
      battery_brand: validItems[0].brand,
      battery_model: validItems[0].model,
      serial_number: validItems[0].serial || null,
      hsn_code: validItems[0].hsn || "85071000",
      vehicle_type: validItems[0].vehicle_type || "Car",
      vehicle_number: validItems[0].vehicle_number || null,
      warranty_months: validItems[0].warranty
        ? parseInt(validItems[0].warranty)
        : null,
    };

    let saleId;
    if (editingItem) {
      const { error } = await supabase
        .from("sales")
        .update(payload)
        .eq("id", editingItem.id);
      if (error) return alert("Error updating: " + error.message);
      saleId = editingItem.id;
      await supabase.from("sale_items").delete().eq("sale_id", saleId);
    } else {
      const { data, error } = await supabase
        .from("sales")
        .insert([payload])
        .select()
        .single();
      if (error) return alert("Error saving: " + error.message);
      saleId = data.id;
    }

    const itemsPayload = validItems.map((i) => ({
      sale_id: saleId,
      battery_brand: i.brand,
      battery_model: i.model,
      serial_number: i.serial || null,
      hsn_code: i.hsn || "85071000",
      mrp: parseFloat(i.mrp) || 0,
      quantity: parseInt(i.qty) || 1,
      vehicle_type: i.vehicle_type || "Car",
      vehicle_number: i.vehicle_number || null,
      warranty_months: i.warranty ? parseInt(i.warranty) : null,
    }));
    const { error: itemError } = await supabase
      .from("sale_items")
      .insert(itemsPayload);
    if (itemError) return alert("Error saving items: " + itemError.message);

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

  const liveSubtotal = items.reduce(
    (sum, i) => sum + (parseFloat(i.mrp) || 0) * (parseInt(i.qty) || 1),
    0,
  );
  const liveDiscountVal = parseFloat(form.discount) || 0;
  const liveDiscountAmount =
    form.discount_type === "percent"
      ? liveSubtotal * (liveDiscountVal / 100)
      : liveDiscountVal;
  const liveTotal = liveSubtotal - liveDiscountAmount;

  const uniqueBrands = useMemo(() => {
    const brands = new Set();
    records.forEach((r) => {
      if (r.items && r.items.length > 0) {
        r.items.forEach((i) => {
          if (i.battery_brand) brands.add(i.battery_brand);
        });
      } else if (r.battery_brand) {
        brands.add(r.battery_brand);
      }
    });
    return ["all", ...Array.from(brands)];
  }, [records]);

  const displayedRecords = useMemo(() => {
    let filtered = records.filter((sale) => {
      const brandMatch =
        filterBrand === "all" ||
        (sale.items && sale.items.length > 0
          ? sale.items.some((i) => i.battery_brand === filterBrand)
          : sale.battery_brand === filterBrand);
      const textMatch =
        sale.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        sale.phone?.toLowerCase().includes(search.toLowerCase()) ||
        `INV-${sale.id?.substring(0, 8).toUpperCase()}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (sale.items && sale.items.length > 0
          ? sale.items.some(
              (i) =>
                i.battery_brand?.toLowerCase().includes(search.toLowerCase()) ||
                i.battery_model?.toLowerCase().includes(search.toLowerCase()) ||
                i.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
                i.vehicle_number?.toLowerCase().includes(search.toLowerCase()),
            )
          : sale.battery_brand?.toLowerCase().includes(search.toLowerCase()) ||
            sale.battery_model?.toLowerCase().includes(search.toLowerCase()) ||
            sale.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
            sale.vehicle_number?.toLowerCase().includes(search.toLowerCase()));
      return brandMatch && textMatch;
    });

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
            placeholder="Search name, phone, vehicle, invoice, battery..."
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
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Battery className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-900 dark:text-white font-bold">
                      {sale.customer_name}{" "}
                      <span className="text-zinc-500 dark:text-zinc-500 font-normal text-xs">
                        ({sale.phone})
                      </span>
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-500 text-xs font-mono truncate">
                      {sale.items && sale.items.length > 0
                        ? `${sale.items.length} item${sale.items.length > 1 ? "s" : ""} • ₹${sale.price || "-"}`
                        : `${sale.battery_brand} ${sale.battery_model} • ₹${sale.price || "-"}`}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedId === sale.id ? 180 : 0 }}
                  className="flex-shrink-0"
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
                      {sale.items && sale.items.length > 0 ? (
                        <div className="mb-4 space-y-2">
                          {sale.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-zinc-900 dark:text-white">
                                  {item.battery_brand} {item.battery_model}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-zinc-900 dark:text-white font-mono">
                                    ₹{item.mrp || "-"}
                                  </div>
                                  <div className="text-zinc-500 dark:text-zinc-400 text-xs">
                                    Qty: {item.quantity || 1}
                                  </div>
                                </div>
                              </div>
                              <div className="text-zinc-500 dark:text-zinc-400 text-xs font-mono mt-1">
                                S/N: {item.serial_number || "N/A"} • HSN:{" "}
                                {item.hsn_code || "-"}
                              </div>
                              <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                                Vehicle: {item.vehicle_type || "-"} (
                                {item.vehicle_number || "-"}) • Warranty:{" "}
                                {item.warranty_months != null
                                  ? `${item.warranty_months} mo`
                                  : "-"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                              Battery
                            </span>
                            <span className="text-zinc-900 dark:text-white">
                              {sale.battery_brand} {sale.battery_model}
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
                              Vehicle
                            </span>
                            <span className="text-zinc-900 dark:text-white">
                              {sale.vehicle_type || "-"} (
                              {sale.vehicle_number || "-"})
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
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="col-span-2">
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
                        <div className="col-span-2 grid grid-cols-3 gap-2 mt-2 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                          <div>
                            <span className="text-zinc-400 dark:text-zinc-500 uppercase text-xs block mb-1">
                              Subtotal
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
                              Total
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

                {/* Items */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs text-zinc-500 uppercase tracking-wider font-bold">
                      Items (Batteries)
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 mb-3">
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                      Select from Inventory (Optional)
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value)
                          handleInventorySelect(e.target.value);
                        e.target.value = "";
                      }}
                      className="premium-input w-full rounded-xl px-4 py-2 outline-none transition-colors text-sm"
                    >
                      <option value="">Pick inventory item...</option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.brand} - {item.model} (₹{item.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500 uppercase">
                            Item {idx + 1}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              Brand
                            </label>
                            <input
                              required
                              value={item.brand}
                              onChange={(e) =>
                                updateItem(idx, "brand", e.target.value)
                              }
                              className="premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm"
                              placeholder="Exide"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              Model
                            </label>
                            <input
                              required
                              value={item.model}
                              onChange={(e) =>
                                updateItem(idx, "model", e.target.value)
                              }
                              className="premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm"
                              placeholder="DIN55"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              Serial No.
                            </label>
                            <input
                              value={item.serial}
                              onChange={(e) =>
                                updateItem(idx, "serial", e.target.value)
                              }
                              className="premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm font-mono"
                              placeholder="SN12345"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              HSN
                            </label>
                            <input
                              value={item.hsn}
                              onChange={(e) =>
                                updateItem(idx, "hsn", e.target.value)
                              }
                              readOnly={!isAdmin}
                              className={`premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                              placeholder="85071000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              MRP (₹)
                            </label>
                            <input
                              type="number"
                              value={item.mrp}
                              onChange={(e) =>
                                updateItem(idx, "mrp", e.target.value)
                              }
                              readOnly={!isAdmin}
                              className={`premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                              placeholder="5000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              Qty
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(idx, "qty", e.target.value)
                              }
                              readOnly={!isAdmin}
                              className={`premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                              placeholder="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              Vehicle Type
                            </label>
                            <input
                              list="vehicle-types"
                              value={item.vehicle_type}
                              onChange={(e) =>
                                updateItem(idx, "vehicle_type", e.target.value)
                              }
                              className="premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm"
                              placeholder="Car"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              Vehicle No.
                            </label>
                            <input
                              value={item.vehicle_number}
                              onChange={(e) =>
                                updateItem(
                                  idx,
                                  "vehicle_number",
                                  e.target.value,
                                )
                              }
                              className="premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm"
                              placeholder="KL01AB1234"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">
                              Warranty (Months)
                            </label>
                            <input
                              type="number"
                              value={item.warranty}
                              onChange={(e) =>
                                updateItem(idx, "warranty", e.target.value)
                              }
                              readOnly={!isAdmin}
                              className={`premium-input w-full rounded-lg px-3 py-2 outline-none transition-colors text-sm font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
                              placeholder="12"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <datalist id="vehicle-types">
                    <option value="Car" />
                    <option value="Bike" />
                    <option value="Truck" />
                    <option value="Auto-rickshaw" />
                    <option value="Bus" />
                    <option value="Inverter" />
                  </datalist>
                </div>

                {/* Overall discount */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
                    Overall Discount
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="discount"
                      value={form.discount || ""}
                      onChange={handleChange}
                      readOnly={!isAdmin}
                      className={`premium-input flex-1 rounded-xl px-4 py-3 outline-none transition-colors font-mono ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
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

                <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 uppercase tracking-wider font-bold text-xs">
                      Subtotal
                    </span>
                    <span className="text-zinc-900 dark:text-white font-mono">
                      ₹{liveSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {liveDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-500 uppercase tracking-wider font-bold text-xs">
                        Discount{" "}
                        {form.discount_type === "percent"
                          ? `(${liveDiscountVal}%)`
                          : ""}
                      </span>
                      <span className="text-red-500 font-mono">
                        - ₹{liveDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-500 uppercase tracking-wider font-bold text-xs">
                      Total
                    </span>
                    <span className="text-green-500 dark:text-green-400 font-mono font-bold">
                      ₹{liveTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
