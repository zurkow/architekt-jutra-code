class CartRecommendation {
  productId int
  productName string
  productDescription string
  productPrice float
  reasoning string
}

function RecommendCartProducts(cartItems: string, availableProducts: string) -> CartRecommendation[] {
  client LlmProvider
  prompt #"
    You are a helpful sales assistant. Your task is to recommend cross-sell and upsell products to a customer based on what they already have in their cart.

    Items currently in the cart:
    {{ cartItems }}

    Available products to recommend (not already in the cart):
    {{ availableProducts }}

    Recommend exactly 3 products from the available products list that would complement or enhance the customer's cart. Focus on products that are genuinely useful together with what the customer already has.

    {{ ctx.output_format }}
  "#
}
