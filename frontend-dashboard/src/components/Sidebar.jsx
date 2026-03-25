import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TreeDeciduous, Activity, Users, Wifi, Settings, HelpCircle } from 'lucide-react';

const Sidebar = ({ isOpen, onClose, onSelectCategory }) => {
  const menuItems = [
    { id: 'satellite', label: 'Deforestation Alerts', icon: <Activity size={20} />, color: 'text-red-400' },
    { id: 'iot', label: 'Acoustic Sensors', icon: <Wifi size={20} />, color: 'text-yellow-400' },
    { id: 'ussd', label: 'Community Reports', icon: <Users size={20} />, color: 'text-blue-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Sidebar Panel */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 bg-[#051a10]/90 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <TreeDeciduous className="text-black" size={24} />
                </div>
                <span className="text-xl font-bold text-white">Sauti Porini</span>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Menu */}
            <div className="flex-1 py-6 px-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase px-4 mb-2">Monitoring</p>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectCategory(item.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group text-left"
                >
                  <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className="text-gray-200 font-medium group-hover:text-white">{item.label}</span>
                </button>
              ))}

              <div className="my-6 border-t border-white/10"></div>

              {/* <p className="text-xs font-bold text-gray-500 uppercase px-4 mb-2">System</p>
              <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-left">
                <Settings size={20} className="text-gray-400" />
                <span className="text-gray-200">Settings</span>
              </button>
              <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all text-left">
                <HelpCircle size={20} className="text-gray-400" />
                <span className="text-gray-200">Help & Support</span>
              </button> */}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-400 to-blue-500"></div>
                <div>
                  <p className="text-sm font-bold text-white">Admin User</p>
                  <p className="text-xs text-gray-400">Kenya Forest Service</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
