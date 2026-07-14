# MongoDB Backend for Quản Lý Hàng

This project contains a simple Node.js backend that connects to MongoDB and exposes CRUD APIs for products.

## Setup

1. Open a terminal in `d:\Quản lí hàng\server`
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Fill in either `MONGODB_URI` or `DB_USERNAME` / `DB_PASSWORD`

## Run

`npm start`

## Endpoints

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

## Notes

- The React app cannot connect directly to MongoDB from the browser.
- Use this backend as the API layer, then call it from your front-end.
