import React, { useState } from "react";
import { User, Globe, LogOut, BarChart2, IdCardLanyard,ShoppingBag, MessageCircle, HelpCircle, Menu,LogIn } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";


const salesSeries = [{ name: "Sales", data: [4000, 3000, 5000, 4000, 7000, 6000, 8000] }];
const salesOptions = {
  chart: { id: "sales-chart", background: "transparent", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 800 } },
  xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], labels: { style: { colors: "#AAA" } } },
  yaxis: { labels: { style: { colors: "#AAA" } } },
  stroke: { curve: "smooth", width: 3 },
  colors: ["#7C3AED"],
  tooltip: { theme: "dark" },
};

const audienceSeries = [60, 40];
const audienceOptions = {
  labels: ["Male", "Female"],
  colors: ["#7C3AED", "#A78BFA"],
  chart: { background: "transparent" },
  legend: { position: "bottom", labels: { colors: "#AAA" } },
  plotOptions: { pie: { donut: { labels: { show: true, name: { color: "#FFF" }, value: { color: "#FFF" } } } } },
  tooltip: { theme: "dark" },
};

export default function CustomerCare() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0F0F12] font-sans text-gray-100">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#141419]/80 backdrop-blur-lg shadow-xl z-50 transform transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex flex-col h-full p-6 border-r border-gray-800">
          <h1 className="text-2xl font-bold text-white mb-8 tracking-widest glow-text">EXPT</h1>

         <nav className="flex-1 space-y-3">
  {[
    { label: "Dashboard", icon: BarChart2, to: "/" },
    { label: "Employee", icon: IdCardLanyard, to: "/manager/employees" },
    { label: "Sign Up", icon: LogIn, to: "/EmployeeSignup" },
    { label: "Analytics", icon: Globe, to: "/analytics" },
  ].map(({ label, icon: Icon, to }) => (
    <Link
      key={label}
      to={to}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300
        hover:shadow-[0_0_20px_#7C3AED] hover:text-[#A78BFA] ${
          label === "Dashboard" ? "bg-[#7C3AED]/20 text-[#A78BFA] shadow-[0_0_15px_#7C3AED]" : "text-gray-400"
        }`}
    >
      <Icon size={20} />
      {label}
    </Link>
  ))}
</nav>


          <div className="mt-auto space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:shadow-[0_0_15px_#7C3AED] hover:text-[#A78BFA] cursor-pointer transition-all">
              <LogOut size={20} /> SignOut
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:shadow-[0_0_15px_#7C3AED] hover:text-[#A78BFA] cursor-pointer transition-all">
              <HelpCircle size={20} /> Help Center
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-72">
        {/* Mobile Burger */}
        <div className="p-4 lg:hidden flex items-center justify-between bg-[#0F0F12] border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white glow-text">Dashboard</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={28} className="text-[#A78BFA]" />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="hidden lg:flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white glow-text">Dashboard</h2>
            <div className="flex items-center gap-4">
              <button className="bg-[#7C3AED] px-4 py-2 rounded-lg text-white hover:bg-[#8B5CF6] transition-all shadow-lg glow-button">
                Export Report
              </button>
              <div className="flex items-center gap-3 bg-[#1C1C21]/70 backdrop-blur-md px-3 py-2 rounded-xl shadow-md">
                <User className="text-[#A78BFA]" size={20} />
                <div>
                  <p className="text-sm text-gray-400">Admin</p>
                  <p className="font-semibold text-white">Omar Bergson</p>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
            {[{ title: "Total Sales", value: "$15,612,545", change: "↑ 12.08% +120,254 today" },
              { title: "Total Order", value: "28,265", change: "↑ 9.08% +1,205 today" }].map(({ title, value, change }) => (
              <div key={title} className="col-span-1 sm:col-span-1 lg:col-span-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg transition-all hover:shadow-[0_0_25px_#7C3AED]">
                <h3 className="text-gray-400 mb-2">{title}</h3>
                <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
                <p className="text-green-400 text-sm mt-1">{change}</p>
                <button className="mt-4 text-[#A78BFA] text-sm hover:underline">View {title.split(" ")[1]} →</button>
              </div>
            ))}

            {/* Top Countries */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg transition-all hover:shadow-[0_0_25px_#7C3AED]">
              <h3 className="text-gray-400 mb-4">Top Countries</h3>
              <ul className="space-y-3">
                <li className="flex justify-between"><span>🇨🇭 Switzerland</span><span className="text-gray-400">35%</span></li>
                <li className="flex justify-between"><span>🇺🇸 United States</span><span className="text-gray-400">45%</span></li>
                <li className="flex justify-between"><span>🇩🇪 Germany</span><span className="text-gray-400">20%</span></li>
              </ul>
            </div>

            {/* Statistics Chart */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-8 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg transition-all hover:shadow-[0_0_25px_#7C3AED]">
              <h3 className="text-gray-400 mb-4">Statistics</h3>
              <ReactApexChart options={salesOptions} series={salesSeries} type="line" height={250} />
            </div>

            {/* Billing Pie */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col items-center transition-all hover:shadow-[0_0_25px_#7C3AED]">
              <h3 className="text-gray-400 mb-4">Billing</h3>
              <ReactApexChart options={audienceOptions} series={audienceSeries} type="donut" width="100%" />
              <p className="text-white mt-2 font-semibold">$5,824,213</p>
            </div>

            {/* Audience */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-6 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg transition-all hover:shadow-[0_0_25px_#7C3AED]">
              <h3 className="text-gray-400 mb-4">Audience</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm mb-1">Male</p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-[#7C3AED] h-2 rounded-full w-[60%]" />
                  </div>
                </div>
                <div>
                  <p className="text-sm mb-1">Female</p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-[#A78BFA] h-2 rounded-full w-[40%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Overview */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-6 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg transition-all hover:shadow-[0_0_25px_#7C3AED]">
              <h3 className="text-gray-400 mb-4">Account Overview</h3>
              <ul className="space-y-3">
                <li className="flex justify-between"><span>Arrival</span><span className="text-gray-400">$5,824,213</span></li>
                <li className="flex justify-between"><span>Withdraw</span><span className="text-gray-400">$3,600,031</span></li>
                <li className="flex justify-between"><span>Balance</span><span className="text-gray-400">$2,224,213</span></li>
              </ul>
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .glow-text {
          text-shadow: 0 0 8px #7C3AED, 0 0 12px #A78BFA, 0 0 18px #7C3AED;
        }
        .glow-button {
          box-shadow: 0 0 10px #7C3AED, 0 0 20px #A78BFA;
        }
      `}</style>
    </div>
  );
}
