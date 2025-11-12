import type { Express, Request, Response } from "express";
import { storage } from "../storage";

/**
 * Seed initial service categories
 */
export async function seedCategories() {
  // Primeiro, verificar se as categorias já existem
  const existingCategories = await storage.getAllServiceCategories();
  
  // Se já existem categorias, não precisamos semear novamente
  if (existingCategories.length > 0) {
    console.log(`ℹ️  Categories already seeded (${existingCategories.length} found), skipping...`);
    return;
  }

  console.log('🌱 Seeding initial service categories...');
  const categories = [
    { name: "Eletricista", icon: "fas fa-bolt", slug: "eletricista" },
    { name: "Encanador", icon: "fas fa-wrench", slug: "encanador" },
    { name: "Faxineira", icon: "fas fa-broom", slug: "faxineira" },
    { name: "Pintor", icon: "fas fa-paint-roller", slug: "pintor" },
    { name: "Jardineiro", icon: "fas fa-seedling", slug: "jardineiro" },
    { name: "Marido de Aluguel", icon: "fas fa-tools", slug: "marido-aluguel" },
    { name: "Pedreiro", icon: "fas fa-hammer", slug: "pedreiro" },
  ];

  for (const category of categories) {
    try {
      await storage.createServiceCategory(category);
      console.log(`  ✓ Created category: ${category.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to create category ${category.name}:`, error);
    }
  }
  console.log('✅ Categories seeded successfully');
}

export function registerCategoryRoutes(app: Express) {
  // Get all categories
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllServiceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
}

