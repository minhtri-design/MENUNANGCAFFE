// Dữ liệu Menu - Nắng Café
const MENU_DATA = [
  {
    category: "Coffee - Cacao - Matcha",
    icon: "☕",
    items: [
      { name: "Đen Phin", price: 15 },
      { name: "Đen Ép", price: 15 },
      { name: "Sữa Phin", price: 17 },
      { name: "Sữa Ép", price: 17 },
      { name: "Sữa Nóng", price: 17 },
      { name: "Bạc Xỉu Nóng", price: 20 },
      { name: "Bạc Xỉu Đá", price: 22 },
      { name: "Cafe Kem Muối", price: 22 },
      { name: "Cafe kem trứng", price: 25 },
      { name: "Cacao Sữa Nóng", price: 20 },
      { name: "Cacao Sữa Đá", price: 20 },
      { name: "Cacao Kem Muối", price: 25 },
      { name: "Cacao Kem Trứng", price: 25 },
      { name: "Matcha Latte", price: 25 },
      { name: "Matcha Latte Dâu", price: 27 },
      { name: "Matcha Latte Xoài", price: 27 },
      { name: "Matcha Kem Muối", price: 25 },
      { name: "Matcha Kem Trứng", price: 25 }
    ]
  },
  {
    category: "Sữa Tươi",
    icon: "🥛",
    items: [
      { name: "Sữa Tươi cà phê", price: 25 },
      { name: "Sữa Tươi Cacao", price: 25 },
      { name: "Sữa Tươi trân châu đường đen", price: 25 },
      { name: "Sữa Tươi tcđđ Kem Trứng dừa nướng", price: 30 }
    ]
  },
  {
    category: "Sữa Chua",
    icon: "🍦",
    items: [
      { name: "Sữa Chua Đá", price: 18 },
      { name: "Sữa Chua Thạch", price: 22 },
      { name: "Sữa chua Dâu Tây", price: 25 },
      { name: "Sữa Chua Việt Quất", price: 25 },
      { name: "Sữa Chua Dâu Tằm", price: 25 },
      { name: "Sữa Chua Hạt Đác", price: 25 },
      { name: "Sữa Chua Mãng Cầu", price: 25 },
      { name: "Sữa Chua Thốt Nốt", price: 25 },
      { name: "Sữa Chua Dâu Tằm Mãng Cầu", price: 27 },
      { name: "Sữa Chua Dâu Tằm Hạt Đác", price: 27 }
    ]
  },
  {
    category: "Nước Ép",
    icon: "🍊",
    items: [
      { name: "Thơm", price: 20 },
      { name: "Cam", price: 20 },
      { name: "Cà Rốt", price: 20 },
      { name: "Ổi", price: 20 },
      { name: "Cà Chua", price: 20 },
      { name: "Thơm Cam", price: 25 },
      { name: "Thơm Cà Rốt", price: 25 },
      { name: "Nước Chanh", price: 17 },
      { name: "Khoáng chanh", price: 17 },
      { name: "Dừa", price: 20 }
    ]
  },
  {
    category: "Soda",
    icon: "🥤",
    items: [
      { name: "Soda Chanh", price: 25 },
      { name: "Soda Dâu", price: 25 },
      { name: "Soda Việt Quất", price: 25 },
      { name: "Soda Biển Xanh", price: 25 },
      { name: "Soda Bạc Hà", price: 25 }
    ]
  },
  {
    category: "Trà Trái Cây",
    icon: "🍵",
    items: [
      { name: "Trà chanh", price: 20 },
      { name: "Trà Đào", price: 25 },
      { name: "Trà Dâu Tây(theo mùa)", price: 25 },
      { name: "Trà Dâu Tằm", price: 25 },
      { name: "Trà Vải", price: 25 },
      { name: "Trà Chanh Dây", price: 25 },
      { name: "Trà Mãng Cầu", price: 27 },
      { name: "Trà Nho", price: 27 },
      { name: "Ooloong Ổi Hồng", price: 27 },
      { name: "Trà Dâu Tằm Hạt Đác", price: 27 },
      { name: "Trà Dâu Mãng Cầu", price: 27 },
      { name: "Trà Ô Long Sen Vàng", price: 27 },
      { name: "Trà Gừng", price: 17 },
      { name: "Trà Gừng Thảo Mộc", price: 22 },
      { name: "Trà Lipton Thảo Mộc", price: 22 }
    ]
  },
  {
    category: "Trà Sữa",
    icon: "🧋",
    items: [
      { name: "Trà Sữa Truyền Thống", price: 25 },
      { name: "Trà Sữa Thái Xanh", price: 25 },
      { name: "Trà Sữa Matcha", price: 27 },
      { name: "Trà Sữa Matcha Kem Trứng Dừa Nướng", price: 30 },
      { name: "Trà Sữa Khoai Môn", price: 25 },
      { name: "Trà Sữa Khoai Môn Kem Trứng Dừa Nướng", price: 30 },
      { name: "Trà Sữa Socola", price: 25 },
      { name: "Trà Sữa Socola Kem Trứng Dừa Nướng", price: 30 },
      { name: "Trà Sữa Ô Long", price: 27 },
      { name: "Trà Sữa TCĐĐ Kem Trứng Dừa Nướng", price: 30 }
    ]
  },
  {
    category: "Nước Ngọt",
    icon: "🧃",
    items: [
      { name: "Vĩnh Hảo", price: 12 },
      { name: "Pepsi", price: 17 },
      { name: "Number One", price: 17 },
      { name: "Stingg", price: 17 },
      { name: "Nutri", price: 17 },
      { name: "Trà Xanh", price: 17 },
      { name: "Bò Húc", price: 20 }
    ]
  },
  {
    category: "Ăn Vặt Chill Chill",
    icon: "🍟",
    items: [
      { name: "Hạt Dưa", price: 12 },
      { name: "Hạt Hướng Dương", price: 12 },
      { name: "Thuốc ngựa", price: 30 }
    ]
  }
];
