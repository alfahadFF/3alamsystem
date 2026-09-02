/* ================================================================
   nav.js — قائمة الإدارة الموحدة (بند 43: توحيد الدوال)
   نسخة واحدة لحقيقة واحدة: أينما تعدّل بنود القائمة تعدّل هنا فقط.
   الصفحات تستخدمها هكذا:
     const MGR_NAV = window.AlfaNav.MGR_NAV;
     const navLink = window.AlfaNav.linker(CURRENT);
   ================================================================ */
window.AlfaNav = (function () {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MGR_NAV = [
    { key: 'dashboard',    label: 'لوحة الإدارة',    icon: '📊', href: 'dashboard.html'    },
    { key: 'sales',        label: 'مبيعات اليوم',    icon: '🧾', href: 'sales.html'        },
    { key: 'expenditures', label: 'الصادرات',        icon: '💸', href: 'expenditures.html' },
    { key: 'menu_admin',   label: 'المنيو والأسعار', icon: '🍔', href: 'menu_admin.html'   },
    { key: 'employees',    label: 'الموظفون',        icon: '👤', href: 'employees.html'    },
    { key: 'customers',    label: 'العملاء',         icon: '👥', href: 'customers.html'    },
    { key: 'inventory',    label: 'المخزون',         icon: '📦', href: 'inventory.html'    },
    { key: 'suppliers',    label: 'الموردون',        icon: '🚚', href: 'suppliers.html'    },
    { key: 'audit_log',    label: 'سجل التعديلات',   icon: '📜', href: 'audit_log.html'    },
    { key: 'contracts',    label: 'العقود',          icon: '📋', href: 'contracts.html'    },
    { key: 'delivery',     label: 'التوصيل',         icon: '🛵', href: 'delivery.html'     },
    { key: 'cash_reports', label: 'الوردية والصندوق', icon: '🔒', href: 'cash_reports.html' },
    { key: 'costs',        label: 'التكاليف',        icon: '💰', href: 'costs.html'        },
    { key: 'settings',     label: 'الإعدادات',       icon: '⚙️', href: 'settings.html'   },
    { key: 'reports',      label: 'التقارير',        icon: '📈', href: 'reports.html'      },
  ];

  /* linker(current) — يُرجع دالة navLink مربوطة بصفحة الحالية */
  function linker(current) {
    return function navLink(n, mobile = false) {
      const active = n.key === current;
      return mobile
        ? `<a class="mgr-mobile-nav-link ${active ? 'active' : ''}" href="${n.href}"><span>${n.icon}</span><small>${esc(n.label)}</small></a>`
        : `<a class="mgr-side-link ${active ? 'active' : ''}" href="${n.href}" title="${esc(n.label)}"><span class="mgr-side-ic">${n.icon}</span><span class="mgr-side-lb">${esc(n.label)}</span></a>`;
    };
  }

  return { MGR_NAV, linker };
})();
