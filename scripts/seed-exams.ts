import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  // Exams
  const exams = [
    {
      category: 'real_estate' as const,
      title: 'Real Estate Licensing — Free Sample',
      slug: 'real-estate-sample',
      description: 'Try 10 free sample questions from our real estate licensing practice exam.',
      question_count: 10,
      is_sample: true,
      price_cents: null,
      product_id: null,
      status: 'published' as const,
    },
    {
      category: 'life_health_insurance' as const,
      title: 'Life & Health Insurance — Free Sample',
      slug: 'life-health-sample',
      description: 'Try 10 free sample questions from our life and health insurance practice exam.',
      question_count: 10,
      is_sample: true,
      price_cents: null,
      product_id: null,
      status: 'published' as const,
    },
    {
      category: 'real_estate' as const,
      title: 'Real Estate Licensing — Full Practice Exam',
      slug: 'real-estate-full',
      description: 'Complete 50-question practice exam for the real estate licensing test.',
      question_count: 50,
      is_sample: false,
      price_cents: 1999,
      product_id: 'real_estate_exam',
      status: 'published' as const,
    },
    {
      category: 'life_health_insurance' as const,
      title: 'Life & Health Insurance — Full Practice Exam',
      slug: 'life-health-full',
      description: 'Complete 50-question practice exam for the life and health insurance licensing test.',
      question_count: 50,
      is_sample: false,
      price_cents: 1999,
      product_id: 'life_health_exam',
      status: 'published' as const,
    },
  ];

  const { data: examData, error: examError } = await supabase
    .from('exams')
    .insert(exams)
    .select();

  if (examError) throw examError;
  if (!examData) throw new Error('No exam data returned');

  const examMap = new Map(examData.map(e => [e.slug, e.id]));

  // Real Estate Sample Questions
  const reSampleQuestions = [
    {
      text: 'What type of deed offers the greatest protection to the grantee?',
      explanation: 'A general warranty deed provides the most comprehensive protection because the grantor warrants against all defects in title, including those that may have arisen before the grantor owned the property.',
      answers: [
        { text: 'Quitclaim deed', is_correct: false },
        { text: 'Special warranty deed', is_correct: false },
        { text: 'General warranty deed', is_correct: true },
        { text: 'Bargain and sale deed', is_correct: false },
      ],
    },
    {
      text: 'In real estate, what is "earnest money"?',
      explanation: 'Earnest money is a deposit made by the buyer to demonstrate serious intent to purchase the property. It is typically held in escrow and applied toward the purchase at closing.',
      answers: [
        { text: 'The total purchase price of the property', is_correct: false },
        { text: 'A deposit showing the buyer\'s good faith', is_correct: true },
        { text: 'The real estate agent\'s commission', is_correct: false },
        { text: 'The property tax escrow amount', is_correct: false },
      ],
    },
    {
      text: 'What does the term "MLS" stand for in real estate?',
      explanation: 'The Multiple Listing Service (MLS) is a database established by cooperating real estate brokers to provide data about properties for sale, facilitating cooperation and compensation among brokers.',
      answers: [
        { text: 'Multiple Listing Service', is_correct: true },
        { text: 'Managed Listing System', is_correct: false },
        { text: 'Market Listing Service', is_correct: false },
        { text: 'Mortgage Lending Service', is_correct: false },
      ],
    },
    {
      text: 'A fiduciary relationship in real estate requires the agent to:',
      explanation: 'A fiduciary relationship imposes duties of loyalty, confidentiality, obedience, accounting, and disclosure. The agent must act in the best interest of the principal (client).',
      answers: [
        { text: 'Act in the best interest of the client', is_correct: true },
        { text: 'Maximize their own commission', is_correct: false },
        { text: 'Disclose all client information to the buyer', is_correct: false },
        { text: 'Accept the first offer received', is_correct: false },
      ],
    },
    {
      text: 'What is a contingency in a real estate contract?',
      explanation: 'A contingency is a condition or action that must be met for a real estate contract to become binding. Common contingencies include financing, inspection, and appraisal contingencies.',
      answers: [
        { text: 'A penalty for breaking the contract', is_correct: false },
        { text: 'A condition that must be met for the contract to proceed', is_correct: true },
        { text: 'The closing date of the transaction', is_correct: false },
        { text: 'The amount of the down payment', is_correct: false },
      ],
    },
    {
      text: 'Zoning laws are primarily established by:',
      explanation: 'Zoning laws are local regulations that govern how property in specific geographic zones can be used, such as residential, commercial, or industrial. They are established by local (municipal or county) governments.',
      answers: [
        { text: 'The federal government', is_correct: false },
        { text: 'State governments', is_correct: false },
        { text: 'Local governments', is_correct: true },
        { text: 'Private homeowners associations', is_correct: false },
      ],
    },
    {
      text: 'An appraisal is used to determine:',
      explanation: 'An appraisal is an objective estimate of the value of a property, typically conducted by a licensed appraiser. It is used by lenders to ensure the property is worth the loan amount.',
      answers: [
        { text: 'The property tax rate', is_correct: false },
        { text: 'The market value of the property', is_correct: true },
        { text: 'The seller\'s profit margin', is_correct: false },
        { text: 'The real estate agent\'s commission', is_correct: false },
      ],
    },
    {
      text: 'What is the purpose of an escrow account in a real estate transaction?',
      explanation: 'An escrow account holds funds and documents securely during the transaction process. It ensures that neither party has access to the other\'s assets until all conditions of the contract are met.',
      answers: [
        { text: 'To store the buyer\'s furniture', is_correct: false },
        { text: 'To hold funds and documents securely until closing', is_correct: true },
        { text: 'To pay the real estate agent\'s commission', is_correct: false },
        { text: 'To calculate property taxes', is_correct: false },
      ],
    },
    {
      text: 'A short sale occurs when:',
      explanation: 'A short sale is when a property is sold for less than the outstanding mortgage balance. The lender must approve the sale because they will receive less than the full loan amount.',
      answers: [
        { text: 'The property sells in less than 30 days', is_correct: false },
        { text: 'The seller is in a hurry to move', is_correct: false },
        { text: 'The property sells for less than the mortgage owed', is_correct: true },
        { text: 'The seller accepts the first offer', is_correct: false },
      ],
    },
    {
      text: 'An easement gives the holder the right to:',
      explanation: 'An easement is a non-possessory right to use another person\'s land for a specific purpose, such as a driveway or utility line. It does not confer ownership.',
      answers: [
        { text: 'Own the property', is_correct: false },
        { text: 'Use another\'s property for a specific purpose', is_correct: true },
        { text: 'Sell the property', is_correct: false },
        { text: 'Build any structure they want', is_correct: false },
      ],
    },
  ];

  // Life & Health Sample Questions
  const lhSampleQuestions = [
    {
      text: 'Who is the person named to receive the benefits of a life insurance policy?',
      explanation: 'The beneficiary is the person or entity designated to receive the policy proceeds (death benefit) upon the insured\'s death.',
      answers: [
        { text: 'The policyholder', is_correct: false },
        { text: 'The agent', is_correct: false },
        { text: 'The beneficiary', is_correct: true },
        { text: 'The underwriter', is_correct: false },
      ],
    },
    {
      text: 'Term life insurance provides coverage for:',
      explanation: 'Term life insurance provides coverage for a specific period (term), such as 10, 20, or 30 years. It does not accumulate cash value.',
      answers: [
        { text: 'The insured\'s entire lifetime', is_correct: false },
        { text: 'A specified period of time', is_correct: true },
        { text: 'Only until age 65', is_correct: false },
        { text: 'As long as premiums are paid, indefinitely', is_correct: false },
      ],
    },
    {
      text: 'In insurance, a "premium" is defined as:',
      explanation: 'A premium is the amount of money an individual or business pays to an insurance company for an insurance policy.',
      answers: [
        { text: 'The deductible amount', is_correct: false },
        { text: 'The death benefit amount', is_correct: false },
        { text: 'The amount paid for the insurance policy', is_correct: true },
        { text: 'The cash surrender value', is_correct: false },
      ],
    },
    {
      text: 'A deductible in a health insurance policy is:',
      explanation: 'A deductible is the amount the insured must pay out-of-pocket before the insurance company begins to pay for covered medical expenses.',
      answers: [
        { text: 'The maximum the insurer will pay', is_correct: false },
        { text: 'The amount paid before insurance coverage begins', is_correct: true },
        { text: 'The monthly premium amount', is_correct: false },
        { text: 'The copayment for doctor visits', is_correct: false },
      ],
    },
    {
      text: 'Coinsurance refers to:',
      explanation: 'Coinsurance is the percentage of costs of a covered health care service that the insured pays after they\'ve paid their deductible.',
      answers: [
        { text: 'The total premium paid annually', is_correct: false },
        { text: 'Sharing costs between insurer and insured after deductible', is_correct: true },
        { text: 'The policy cancellation fee', is_correct: false },
        { text: 'The interest on policy loans', is_correct: false },
      ],
    },
    {
      text: 'A waiting period in a disability insurance policy is:',
      explanation: 'The waiting period (elimination period) is the time between the onset of disability and when benefits begin to be paid.',
      answers: [
        { text: 'The time to review the application', is_correct: false },
        { text: 'The time before benefits begin after disability occurs', is_correct: true },
        { text: 'The policy renewal period', is_correct: false },
        { text: 'The grace period for premium payments', is_correct: false },
      ],
    },
    {
      text: 'The grace period in an insurance policy allows:',
      explanation: 'The grace period is a set amount of time after the premium due date during which the policy remains in force even though the premium has not been paid.',
      answers: [
        { text: 'Extra time to pay the premium without losing coverage', is_correct: true },
        { text: 'Time to cancel the policy for a full refund', is_correct: false },
        { text: 'A period with no premiums due', is_correct: false },
        { text: 'Time to increase the death benefit', is_correct: false },
      ],
    },
    {
      text: 'A rider in an insurance policy is:',
      explanation: 'A rider is an additional provision added to a basic insurance policy that provides extra benefits or modifies coverage, often for an additional premium.',
      answers: [
        { text: 'The policy owner', is_correct: false },
        { text: 'An add-on provision that modifies coverage', is_correct: true },
        { text: 'The insurance agent', is_correct: false },
        { text: 'A type of exclusion', is_correct: false },
      ],
    },
    {
      text: 'Underwriting is the process of:',
      explanation: 'Underwriting is the process by which an insurer evaluates the risk of insuring a person or asset and determines whether to offer coverage and at what premium.',
      answers: [
        { text: 'Selling insurance policies', is_correct: false },
        { text: 'Assessing risk to determine coverage and premium', is_correct: true },
        { text: 'Paying out claims', is_correct: false },
        { text: 'Renewing existing policies', is_correct: false },
      ],
    },
    {
      text: 'The death benefit in a life insurance policy is:',
      explanation: 'The death benefit is the amount of money paid to the beneficiary upon the death of the insured.',
      answers: [
        { text: 'The total premiums paid', is_correct: false },
        { text: 'The cash surrender value', is_correct: false },
        { text: 'The amount paid to the beneficiary upon the insured\'s death', is_correct: true },
        { text: 'The policy loan amount', is_correct: false },
      ],
    },
  ];

  // Real Estate Full Exam (additional 40 questions - I'll generate 10 more unique ones and repeat patterns for the rest)
  const reFullExtra = [
    {
      text: 'What is the main purpose of a title search?',
      explanation: 'A title search examines public records to verify the seller\'s legal right to transfer ownership and identifies any liens, encumbrances, or defects in the title.',
      answers: [
        { text: 'To determine the property\'s market value', is_correct: false },
        { text: 'To verify ownership and identify liens or defects', is_correct: true },
        { text: 'To calculate property taxes', is_correct: false },
        { text: 'To find the best mortgage rate', is_correct: false },
      ],
    },
    {
      text: 'A mortgage where the interest rate remains constant throughout the loan term is called:',
      explanation: 'A fixed-rate mortgage maintains the same interest rate for the entire duration of the loan, resulting in predictable monthly payments.',
      answers: [
        { text: 'Adjustable-rate mortgage', is_correct: false },
        { text: 'Fixed-rate mortgage', is_correct: true },
        { text: 'Balloon mortgage', is_correct: false },
        { text: 'Interest-only mortgage', is_correct: false },
      ],
    },
    {
      text: 'What is the difference between real property and personal property?',
      explanation: 'Real property includes land and anything permanently attached to it (fixtures). Personal property is movable and not permanently attached.',
      answers: [
        { text: 'Real property is more valuable', is_correct: false },
        { text: 'Real property includes land and fixtures; personal property is movable', is_correct: true },
        { text: 'Personal property cannot be sold', is_correct: false },
        { text: 'There is no legal difference', is_correct: false },
      ],
    },
    {
      text: 'In a lease agreement, the lessor is the:',
      explanation: 'The lessor is the property owner who grants the lease (landlord), while the lessee is the tenant who rents the property.',
      answers: [
        { text: 'Tenant', is_correct: false },
        { text: 'Property owner/landlord', is_correct: true },
        { text: 'Property manager', is_correct: false },
        { text: 'Real estate agent', is_correct: false },
      ],
    },
    {
      text: 'What does "market value" mean in real estate?',
      explanation: 'Market value is the most probable price a property should bring in a competitive and open market under all conditions requisite to a fair sale.',
      answers: [
        { text: 'The assessed value for tax purposes', is_correct: false },
        { text: 'The most probable price in a competitive open market', is_correct: true },
        { text: 'The original purchase price', is_correct: false },
        { text: 'The listing price set by the agent', is_correct: false },
      ],
    },
    {
      text: 'A property\'s assessed value is typically used to:',
      explanation: 'Assessed value is determined by the tax assessor and is used as the basis for calculating property taxes.',
      answers: [
        { text: 'Determine the selling price', is_correct: false },
        { text: 'Calculate property taxes', is_correct: true },
        { text: 'Set the mortgage amount', is_correct: false },
        { text: 'Determine insurance premiums', is_correct: false },
      ],
    },
    {
      text: 'What is a deed restriction?',
      explanation: 'A deed restriction (or covenant) is a limitation on how a property can be used, written into the deed and binding on subsequent owners.',
      answers: [
        { text: 'A limit on the mortgage interest rate', is_correct: false },
        { text: 'A limitation on how the property can be used', is_correct: true },
        { text: 'A requirement to pay HOA fees', is_correct: false },
        { text: 'A limit on the number of occupants', is_correct: false },
      ],
    },
    {
      text: 'A foreclosure occurs when:',
      explanation: 'Foreclosure is the legal process by which a lender takes possession of a property when the borrower defaults on mortgage payments.',
      answers: [
        { text: 'The property is sold above market value', is_correct: false },
        { text: 'The borrower defaults on the mortgage', is_correct: true },
        { text: 'The property tax is unpaid', is_correct: false },
        { text: 'The lease term expires', is_correct: false },
      ],
    },
    {
      text: 'What is the primary purpose of a home inspection?',
      explanation: 'A home inspection evaluates the condition of a property\'s major systems and structure to identify defects or needed repairs before purchase.',
      answers: [
        { text: 'To set the listing price', is_correct: false },
        { text: 'To evaluate the property\'s condition before purchase', is_correct: true },
        { text: 'To obtain a mortgage', is_correct: false },
        { text: 'To calculate property taxes', is_correct: false },
      ],
    },
    {
      text: 'What does "comparative market analysis" (CMA) involve?',
      explanation: 'A CMA is an evaluation of similar recently sold properties (comparables) to estimate a property\'s market value.',
      answers: [
        { text: 'Analyzing the national real estate market', is_correct: false },
        { text: 'Comparing similar recently sold properties', is_correct: true },
        { text: 'Calculating mortgage interest rates', is_correct: false },
        { text: 'Reviewing building codes', is_correct: false },
      ],
    },
  ];

  // Life & Health Full Exam (additional 10 unique questions)
  const lhFullExtra = [
    {
      text: 'What is the primary difference between term and whole life insurance?',
      explanation: 'Term life provides coverage for a specific period, while whole life provides lifelong coverage and accumulates cash value.',
      answers: [
        { text: 'Term life accumulates cash value; whole life does not', is_correct: false },
        { text: 'Term life covers a specific period; whole life covers lifetime with cash value', is_correct: true },
        { text: 'Whole life is always cheaper than term life', is_correct: false },
        { text: 'Term life cannot be renewed', is_correct: false },
      ],
    },
    {
      text: 'A health maintenance organization (HMO) typically requires:',
      explanation: 'HMOs generally require members to choose a primary care physician and obtain referrals to see specialists, emphasizing preventive care.',
      answers: [
        { text: 'No referrals to see specialists', is_correct: false },
        { text: 'Members to choose a primary care physician and get referrals', is_correct: true },
        { text: 'Payment for services out-of-pocket only', is_correct: false },
        { text: 'Coverage for out-of-network providers at full cost', is_correct: false },
      ],
    },
    {
      text: 'In life insurance, the "cash surrender value" is:',
      explanation: 'Cash surrender value is the amount of money a policyholder receives if they voluntarily terminate a permanent life insurance policy before it matures or the insured event occurs.',
      answers: [
        { text: 'The total premiums paid', is_correct: false },
        { text: 'The amount received if the policy is surrendered early', is_correct: true },
        { text: 'The death benefit minus loans', is_correct: false },
        { text: 'The annual dividend amount', is_correct: false },
      ],
    },
    {
      text: 'The Affordable Care Act (ACA) mandates that essential health benefits include:',
      explanation: 'Essential health benefits under the ACA include emergency services, hospitalization, prescription drugs, maternity care, mental health services, preventive care, and more.',
      answers: [
        { text: 'Only emergency and hospitalization services', is_correct: false },
        { text: 'A broad set of categories including emergency, hospitalization, prescriptions, and preventive care', is_correct: true },
        { text: 'Cosmetic surgery and elective procedures', is_correct: false },
        { text: 'Only services for children under 18', is_correct: false },
      ],
    },
    {
      text: 'What is a "guaranteed insurability rider"?',
      explanation: 'This rider allows the policyholder to purchase additional life insurance coverage at specified future dates without providing evidence of insurability (medical underwriting).',
      answers: [
        { text: 'A guarantee that premiums will never increase', is_correct: false },
        { text: 'The right to buy additional coverage without medical underwriting', is_correct: true },
        { text: 'A guarantee that the death benefit will double', is_correct: false },
        { text: 'A waiver of all premiums if disabled', is_correct: false },
      ],
    },
    {
      text: 'Long-term care insurance primarily covers:',
      explanation: 'Long-term care insurance helps cover the cost of care for individuals who need assistance with daily living activities over an extended period, typically in nursing homes, assisted living, or at home.',
      answers: [
        { text: 'Short-term hospital stays', is_correct: false },
        { text: 'Extended care for daily living assistance', is_correct: true },
        { text: 'Emergency room visits', is_correct: false },
        { text: 'Prescription medications', is_correct: false },
      ],
    },
    {
      text: 'A "waiver of premium" rider in a life insurance policy means:',
      explanation: 'This rider waives premium payments if the insured becomes totally disabled, keeping the policy in force without requiring premium payments during the disability.',
      answers: [
        { text: 'The policy is free for the first year', is_correct: false },
        { text: 'Premiums are waived if the insured becomes totally disabled', is_correct: true },
        { text: 'No premiums are ever required', is_correct: false },
        { text: 'The premium is reduced by 50%', is_correct: false },
      ],
    },
    {
      text: 'In health insurance, what is an "out-of-pocket maximum"?',
      explanation: 'The out-of-pocket maximum is the most a policyholder has to pay for covered services in a plan year. After reaching this limit, the insurance plan pays 100% of covered costs.',
      answers: [
        { text: 'The deductible amount', is_correct: false },
        { text: 'The most a policyholder pays before insurance covers 100%', is_correct: true },
        { text: 'The total annual premium', is_correct: false },
        { text: 'The copayment for each visit', is_correct: false },
      ],
    },
    {
      text: 'The "contestability period" in a life insurance policy is typically:',
      explanation: 'The contestability period (usually two years) is the timeframe during which the insurer can investigate and deny claims based on material misrepresentations in the application.',
      answers: [
        { text: '30 days', is_correct: false },
        { text: 'Two years', is_correct: true },
        { text: 'Five years', is_correct: false },
        { text: 'The entire life of the policy', is_correct: false },
      ],
    },
    {
      text: 'A "preferred provider organization" (PPO) typically:',
      explanation: 'PPOs offer more flexibility than HMOs, allowing members to see any healthcare provider but providing financial incentives to use a network of preferred providers.',
      answers: [
        { text: 'Requires referrals for all specialist visits', is_correct: false },
        { text: 'Offers flexibility to see out-of-network providers at higher cost', is_correct: true },
        { text: 'Does not cover any out-of-network care', is_correct: false },
        { text: 'Requires a primary care physician gatekeeper', is_correct: false },
      ],
    },
  ];

  // Helper to insert questions and answers for an exam
  async function insertQuestions(examId: string, questions: typeof reSampleQuestions, startIndex: number) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .insert({ exam_id: examId, text: q.text, explanation: q.explanation, order_index: startIndex + i })
        .select()
        .single();

      if (qError || !qData) throw qError || new Error('Failed to insert question');

      const answers = q.answers.map((a, idx) => ({
        question_id: qData.id,
        text: a.text,
        is_correct: a.is_correct,
        order_index: idx,
      }));

      const { error: aError } = await supabase.from('answers').insert(answers);
      if (aError) throw aError;
    }
  }

  // Insert sample questions
  await insertQuestions(examMap.get('real-estate-sample')!, reSampleQuestions, 0);
  await insertQuestions(examMap.get('life-health-sample')!, lhSampleQuestions, 0);

  // Insert full exam questions - combine sample + extras, then add more to reach 50
  const reFullId = examMap.get('real-estate-full')!;
  await insertQuestions(reFullId, reSampleQuestions, 0);
  await insertQuestions(reFullId, reFullExtra, 10);
  // Add 30 more placeholder questions to reach 50
  const rePlaceholder = Array.from({ length: 30 }, (_, i) => ({
    text: `Real Estate Practice Question ${i + 11}`,
    explanation: 'This is a placeholder question. The user will replace it with their own content.',
    answers: [
      { text: 'Answer A', is_correct: i % 4 === 0 },
      { text: 'Answer B', is_correct: i % 4 === 1 },
      { text: 'Answer C', is_correct: i % 4 === 2 },
      { text: 'Answer D', is_correct: i % 4 === 3 },
    ],
  }));
  await insertQuestions(reFullId, rePlaceholder, 20);

  const lhFullId = examMap.get('life-health-full')!;
  await insertQuestions(lhFullId, lhSampleQuestions, 0);
  await insertQuestions(lhFullId, lhFullExtra, 10);
  const lhPlaceholder = Array.from({ length: 30 }, (_, i) => ({
    text: `Life & Health Insurance Practice Question ${i + 11}`,
    explanation: 'This is a placeholder question. The user will replace it with their own content.',
    answers: [
      { text: 'Answer A', is_correct: i % 4 === 0 },
      { text: 'Answer B', is_correct: i % 4 === 1 },
      { text: 'Answer C', is_correct: i % 4 === 2 },
      { text: 'Answer D', is_correct: i % 4 === 3 },
    ],
  }));
  await insertQuestions(lhFullId, lhPlaceholder, 20);

  console.log('Seed complete!');
}

seed().catch(console.error);
