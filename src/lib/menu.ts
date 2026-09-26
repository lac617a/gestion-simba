/**
 * Menú de Simba (transcrito del PDF del restaurante, sept. 2026). Precios en
 * pesos colombianos. Para cambiar un precio o un plato, se edita aquí.
 */

export type MenuItem = { name: string; description?: string; price: number };
export type MenuSection = {
  id: string;
  title: string;
  /** Texto corto bajo el título */
  note?: string;
  items: MenuItem[];
  /** Grupos con subtítulo (bebidas) */
  groups?: { title: string; note?: string; items: MenuItem[] }[];
};

export const MENU: MenuSection[] = [
  {
    id: "entradas",
    title: "Entradas",
    items: [
      { name: "Rugido", description: "Chorizo caramelizado y arepa santandereana.", price: 15000 },
      { name: "Zafira", description: "Rellena y arepa santandereana.", price: 15000 },
      { name: "Simba", description: "Rellena, chorizo caramelizado y arepa santandereana.", price: 15000 },
    ],
  },
  {
    id: "hamburguesas",
    title: "Hamburguesas",
    items: [
      { name: "Zazú", description: "150 gr de carne de res, queso fundido, aros de cebolla, vegetales frescos.", price: 26000 },
      {
        name: "Rafiki",
        description: "150 gr de carne de res, pollo desmechado, queso fundido, aros de cebolla, vegetales frescos.",
        price: 31000,
      },
      {
        name: "Bunga",
        description:
          "150 gr de jugosa carne de res, queso chítaga, aros de cebolla, salsa de tocineta caramelizada y vegetales frescos.",
        price: 32000,
      },
      {
        name: "Sarabi",
        description:
          "150 gr de carne de res, 150 gr de filete de pechuga a la plancha, queso fundido, aros de cebolla y vegetales frescos.",
        price: 33000,
      },
      {
        name: "Ed",
        description:
          "150 gr de jugosa carne de res, chorizo criollo bañado en chimichurri, arepa santandereana, tocineta, queso fundido, aros de cebolla, vegetales frescos.",
        price: 34000,
      },
      {
        name: "Sarafina",
        description:
          "150 gr de carne de res, queso craft, tocineta caramelizada en lonja, aros de cebolla, salsas de la casa y vegetales frescos.",
        price: 35000,
      },
      {
        name: "Nala",
        description:
          "150 gr de carne de res, pollo desmechado, chorizo criollo bañado en chimichurri, tocineta, queso fundido, aros de cebolla y vegetales.",
        price: 36000,
      },
      {
        name: "Timón",
        description:
          "150 gr de jugosa carne de res, 150 gr de pechuga a la plancha, chorizo criollo bañado en chimichurri, queso fundido, aros de cebolla, vegetales frescos.",
        price: 34000,
      },
      {
        name: "Pumba",
        description: "300 gr de jugosa carne de res, tocineta, queso fundido, aros de cebolla y vegetales frescos.",
        price: 35000,
      },
      {
        name: "Amara",
        description:
          "150 gr de carne de res, 125 gr de carne desmechada en salsa BBQ, maduritos en fajas, aros de cebolla, salsas de la casa y vegetales frescos.",
        price: 41000,
      },
      {
        name: "Scar",
        description:
          "150 gr de jugosa carne de res, 125 gr de carne a la llanera bañada en chimichurri, tocineta, queso fundido, aros de cebolla y vegetales frescos.",
        price: 38000,
      },
      {
        name: "Kiara",
        description:
          "150 gr de jugosa carne de res, 125 gr de carne oreada, tocineta, queso fundido, aros de cebolla y vegetales frescos.",
        price: 38000,
      },
      {
        name: "Kion",
        description:
          "150 gr de jugosa carne de res, 125 gr de lomo de cerdo ahumado, tocineta, queso fundido, aros de cebolla y vegetales frescos.",
        price: 38000,
      },
      {
        name: "Mufasa",
        description:
          "300 gr de carne de res, pollo desmechado, chorizo criollo bañado en chimichurri, tocineta, queso fundido, aros de cebolla, salsas de la casa, vegetales frescos.",
        price: 43000,
      },
      {
        name: "Hyena",
        description:
          "150 gr de jugosa carne de res, guacamole, queso fundido, tocineta, costillas de cerdo, aros de cebolla, salsas de la casa y vegetales frescos.",
        price: 38000,
      },
      {
        name: "Simba",
        description:
          "300 gr de jugosa carne de res, 150 gr de pechuga a la plancha, pollo desmechado, chorizo criollo bañado en chimichurri, tocineta, queso fundido, aros de cebolla, salsas de la casa y vegetales frescos.",
        price: 45000,
      },
    ],
  },
  {
    id: "perros",
    title: "Perros",
    items: [
      { name: "Timón", description: "Salchicha americana, papa picada, salsa de la casa, queso fundido.", price: 23000 },
      {
        name: "Pumba",
        description: "Salchicha americana, pollo desmechado, papas ripio, salsas de la casa y queso fundido.",
        price: 27000,
      },
      {
        name: "Simba",
        description: "Salchicha americana, pollo desmechado, chorizo criollo, papa ripio, tocineta, queso fundido.",
        price: 32000,
      },
      {
        name: "Perrono",
        description: "Chorizo de ternera, pollo desmechado, carne en cubos, cebolla cruda, tocineta, queso fundido.",
        price: 35000,
      },
    ],
  },
  {
    id: "parrilla",
    title: "Parrilla",
    note: "Término de la carne: sellado, azul, medio, 3/4 o bien asado.",
    items: [
      {
        name: "Pechuga a la parrilla",
        description: "400 gr de filete de pechuga bañada en chimichurri, papa francesa o amarilla y ensalada.",
        price: 38000,
      },
      {
        name: "Pechuga Simba",
        description: "400 gr de pechuga a la plancha bañada en salsa de queso, tocineta, papa amarilla y ensalada.",
        price: 46000,
      },
      {
        name: "Costillas de cerdo",
        description: "300 gr de costillas de cerdo bañadas en salsa BBQ, papa amarilla o francesa y ensalada.",
        price: 45000,
      },
      {
        name: "Churrasco",
        description: "350 gr de carne de res a la parrilla, papa amarilla o francesa y ensalada.",
        price: 53000,
      },
      {
        name: "Rib eye hueso corto",
        description: "350 gr de carne de res a la parrilla, papa amarilla o francesa y ensalada.",
        price: 65000,
      },
      {
        name: "Tibón",
        description: "350 gr de carne de res a la parrilla, papa amarilla o francesa y ensalada.",
        price: 65000,
      },
      {
        name: "Punta de anca",
        description: "350 gr de carne de res a la parrilla, papa amarilla o francesa y ensalada.",
        price: 65000,
      },
    ],
  },
  {
    id: "papas",
    title: "Papas",
    items: [
      {
        name: "Salchipapa",
        description: "Papa amarilla o francesa, salchicha americana, queso rallado, salsas de la casa y papa ripio.",
        price: 23000,
      },
      { name: "Rústicas de la selva", description: "Papa amarilla o francesa, vegetales frescos.", price: 15000 },
      {
        name: "Choripapa",
        description: "Papa amarilla o francesa, chorizo criollo, queso rallado, salsas de la casa y papa ripio.",
        price: 23000,
      },
      {
        name: "Papas Shenzi",
        description:
          "Papa amarilla o francesa, salchicha americana, chorizo, pollo desmechado, salsas de la casa, papa ripio y queso salado o fundido.",
        price: 36000,
      },
      {
        name: "Súper Simba",
        description:
          "Salchicha americana, chorizo criollo, pollo desmechado bañado en salsas de la casa, maíz tierno, carne asada en cubos, queso salado o fundido.",
        price: 42000,
      },
      {
        name: "Papas Kayros",
        description:
          "Papa amarilla o francesa, salchicha americana, chorizo criollo, pollo desmechado, carne a la llanera, maíz tierno, salsas de la casa, queso rallado o fundido.",
        price: 43000,
      },
      {
        name: "Papas Chigaru",
        description:
          "Papa amarilla o francesa, chorizo criollo, chicharrón, carne desmechada, maduros, salsas de la casa, queso rallado o fundido.",
        price: 43000,
      },
      {
        name: "Papas Taka",
        description:
          "Papa amarilla o francesa, salchicha americana, chicharrón, carne oreada, maduros, queso rallado o fundido.",
        price: 45000,
      },
    ],
  },
  {
    id: "desgranados",
    title: "Desgranados",
    items: [
      {
        name: "Sarabi",
        description: "Maíz tierno, pollo desmechado, tocineta, queso fundido, salsas de la casa, papa francesa o amarilla.",
        price: 26000,
      },
      {
        name: "Nala",
        description:
          "Maíz tierno, pollo desmechado, carne de res en cuadros, queso fundido, salsas de la casa y papa francesa o amarilla.",
        price: 31000,
      },
    ],
  },
  {
    id: "sandwich",
    title: "Sándwich",
    items: [
      {
        name: "Mufasa",
        description:
          "Pan finas hierbas, pollo desmechado bañado en salsa de la casa, tocineta, queso fundido, vegetales frescos y papa amarilla o francesa.",
        price: 28000,
      },
      {
        name: "Simba",
        description:
          "Pan finas hierbas, pollo desmechado bañado en salsas de la casa, tocineta, carne de res en cubos, queso fundido, vegetales frescos y papa francesa o amarilla.",
        price: 35000,
      },
    ],
  },
  {
    id: "bebidas",
    title: "Bebidas",
    items: [],
    groups: [
      {
        title: "Granizados y jugos naturales",
        note: "Limón, mandarinada, maracuyá, cereza, hierbabuena, lulo, fresa o frutos rojos.",
        items: [
          { name: "Granizado o jugo natural", price: 10000 },
          { name: "Limonada de coco", price: 14000 },
        ],
      },
      {
        title: "Sodas frutales",
        items: [
          { name: "Hierbabuena", price: 11000 },
          { name: "Frutos rojos", price: 11000 },
          { name: "Frutos amarillos", price: 11000 },
        ],
      },
      {
        title: "Cervezas",
        items: [
          { name: "Águila negra", price: 6000 },
          { name: "Águila light", price: 6000 },
          { name: "Budweiser", price: 6000 },
          { name: "Poker", price: 6000 },
          { name: "Club Colombia", price: 7000 },
          { name: "Coronita", price: 7000 },
        ],
      },
      {
        title: "Micheladas",
        items: [
          { name: "Tradicional", price: 3000 },
          { name: "Frutos rojos", price: 6000 },
          { name: "Frutos amarillos", price: 6000 },
          { name: "Chamoy", price: 6000 },
        ],
      },
      {
        title: "Gaseosas",
        items: [
          { name: "Agua en botella", price: 5000 },
          { name: "Soda", price: 5000 },
          { name: "Personal", price: 6000 },
          { name: "Litro y medio", price: 11000 },
        ],
      },
      {
        title: "Licores",
        items: [
          { name: "Buchanan's 750 ml", price: 270000 },
          { name: "José Cuervo", price: 150000 },
          { name: "Aguardiente amarillo", price: 100000 },
        ],
      },
      {
        title: "Postre",
        items: [{ name: "Torta Simba", price: 13000 }],
      },
    ],
  },
  {
    id: "adicionales",
    title: "Adicionales",
    items: [
      { name: "Maduritos", price: 3000 },
      { name: "Jalapeños", price: 3000 },
      { name: "Tocineta", price: 3000 },
      { name: "Chorizo criollo", price: 5000 },
      { name: "Filete de pechuga", price: 8000 },
      { name: "Carne de hamburguesa", price: 8000 },
      { name: "Pollo desmechado", price: 8000 },
      { name: "Papa criolla", price: 8000 },
      { name: "Lomo de cerdo", price: 8000 },
      { name: "Carne desmechada en salsa BBQ", price: 10000 },
      { name: "Carne oreada", price: 10000 },
      { name: "Chicharrón", price: 10000 },
      { name: "Papa francesa", price: 10000 },
      { name: "Carne a la llanera", price: 10000 },
    ],
  },
];
