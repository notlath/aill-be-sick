import { describe, it } from 'vitest';
import * as actions from './actions/email-auth';
import prisma from './prisma/prisma';
import { createClient } from './utils/supabase/server';

console.log("Starting debug run");
