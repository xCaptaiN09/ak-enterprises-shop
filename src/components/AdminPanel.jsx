import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Save, Mail, Check, X } from "lucide-react";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    shop_name: "",
    shop_address: "",
    shop_phone: "",
    shop_email: "",
    shop_gstin: "",
    shop_state: "",
    shop_pincode: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("email", { ascending: true });
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (data) setSettings(data);
  };

  const toggleApproval = async (userId, currentStatus) => {
    await supabase
      .from("profiles")
      .update({ approved: !currentStatus })
      .eq("id", userId);
    fetchUsers();
  };

  const handleSettingsChange = (e) =>
    setSettings({ ...settings, [e.target.name]: e.target.value });

  const handleSettingsSave = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("shop_settings")
      .update({
        shop_name: settings.shop_name,
        shop_address: settings.shop_address,
        shop_phone: settings.shop_phone,
        shop_email: settings.shop_email,
        shop_gstin: settings.shop_gstin,
        shop_state: settings.shop_state,
        shop_pincode: settings.shop_pincode,
      })
      .eq("id", 1);

    if (error) alert("Error saving settings: " + error.message);
    else alert("Shop settings saved successfully!");
    setSavingSettings(false);
  };

  const statusColors = {
    Active:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    Suspended: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    "Always Active":
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-4xl font-extrabold tracking-tighter mb-2 text-zinc-900 dark:text-white">
          Admin Panel
        </h2>
        <p className="text-base text-zinc-500 dark:text-zinc-500 font-medium">
          Manage shop settings and worker access.
        </p>
      </div>

      {/* Shop Settings */}
      <div className="glass-card p-8 rounded-3xl mb-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
          <Save className="w-5 h-5" /> Shop Details (For Invoices)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
              Shop Name
            </label>
            <input
              name="shop_name"
              value={settings.shop_name || ""}
              onChange={handleSettingsChange}
              className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
              Shop Address
            </label>
            <input
              name="shop_address"
              value={settings.shop_address || ""}
              onChange={handleSettingsChange}
              className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
              Shop Phone
            </label>
            <input
              name="shop_phone"
              value={settings.shop_phone || ""}
              onChange={handleSettingsChange}
              className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
              Shop Email
            </label>
            <input
              type="email"
              name="shop_email"
              value={settings.shop_email || ""}
              onChange={handleSettingsChange}
              className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono"
              placeholder="shop@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
              Shop GSTIN
            </label>
            <input
              name="shop_gstin"
              value={settings.shop_gstin || ""}
              onChange={handleSettingsChange}
              className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
              Shop State
            </label>
            <input
              name="shop_state"
              value={settings.shop_state || ""}
              onChange={handleSettingsChange}
              className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-bold">
              Shop Pincode
            </label>
            <input
              name="shop_pincode"
              value={settings.shop_pincode || ""}
              onChange={handleSettingsChange}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="premium-input w-full rounded-xl px-4 py-3 outline-none transition-colors font-mono"
              placeholder="673001"
            />
          </div>
        </div>
        <button
          onClick={handleSettingsSave}
          disabled={savingSettings}
          className="mt-6 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-3 px-6 rounded-xl text-sm hover:opacity-80 transition-opacity"
        >
          {savingSettings ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Users List */}
      <div className="glass-card text-xs p-4 rounded-2xl mb-4 text-zinc-600 dark:text-zinc-400">
        Note: Suspended workers remain in the list. They can still log in, but
        cannot see any shop data.
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            No users found.
          </div>
        ) : (
          users.map((user) => {
            const currentStatus =
              user.role === "admin"
                ? "Always Active"
                : user.approved
                  ? "Active"
                  : "Suspended";
            return (
              <div
                key={user.id}
                className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-zinc-900 dark:text-white font-bold text-sm truncate">
                      {user.email}
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-500 text-xs capitalize">
                      {user.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0 sm:pl-4 mt-3 sm:mt-0">
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap ${statusColors[currentStatus]}`}
                  >
                    {currentStatus}
                  </span>
                  {user.role !== "admin" && (
                    <button
                      onClick={() => toggleApproval(user.id, user.approved)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${user.approved ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20" : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20"}`}
                    >
                      {user.approved ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Suspend
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" /> Approve
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
