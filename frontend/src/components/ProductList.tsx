interface Product {
  id: string;
  name: string;
  color: string;
  category: string;
  price: number;
  image: string;
}

export default function ProductList({ products = [] } : { products: Product[] }) {
  if (!products.length) return <div>No products to show</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {products.map((p) => (
        <div key={p.id} style={{ border: "1px solid #eaeaea", borderRadius: 8, padding: 8 }}>
          <img src={p.image} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6 }} />
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div style={{ color: "#666", fontSize: 13 }}>{p.color} • {p.category}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>₹{p.price}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
