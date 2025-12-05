// src/controllers/contact.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**/
//  POST - Contact Form storing Entries
/**/
export const createContact = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Optional: very basic email & phone check (you can tighten this)
    const trimmedEmail = String(email).trim();
    if (!trimmedEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Create contact record in DB
    const contact = await prisma.contact.create({
      data: {
        firstname: firstName,
        lastname: lastName,
        email: trimmedEmail,
        phoneNumber: phone,
        message,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Your message has been received. We'll get back to you soon.",
      data: contact,
    });
  } catch (error) {
    console.error("Error creating contact:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while submitting your message.",
    });
  }
};

/**/
//  GET - Controller for Contact Form Entries  (ADMIN)
/**/
export const getContacts = async (req: Request, res: Response) => {
  try {
    // Pagination params
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "10", 10);

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : limit;

    const skip = (safePage - 1) * safeLimit;
    const take = safeLimit;

    // Date filters (expected format: YYYY-MM-DD)
    const { startDate, endDate } = req.query;

    let createdAtFilter: { gte?: Date; lte?: Date } = {};

    if (startDate) {
      const parsedStart = new Date(startDate as string);
      if (isNaN(parsedStart.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid startDate format. Use YYYY-MM-DD.",
        });
      }
      // Start of that day (00:00:00)
      parsedStart.setHours(0, 0, 0, 0);
      createdAtFilter.gte = parsedStart;
    }

    if (endDate) {
      const parsedEnd = new Date(endDate as string);
      if (isNaN(parsedEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid endDate format. Use YYYY-MM-DD.",
        });
      }
      // End of that day (23:59:59)
      parsedEnd.setHours(23, 59, 59, 999);
      createdAtFilter.lte = parsedEnd;
    }

    const where =
      createdAtFilter.gte || createdAtFilter.lte
        ? { createdAt: createdAtFilter }
        : {};

    // Get total count (for pagination UI)
    const total = await prisma.contact.count({ where });

    // Fetch page data
    const contacts = await prisma.contact.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / safeLimit) || 1;

    return res.status(200).json({
      success: true,
      data: contacts,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching contacts.",
    });
  }
};
