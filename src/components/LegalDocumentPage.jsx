import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { IoArrowBackOutline } from 'react-icons/io5';
import { PRODUCT_NAME } from '../constants/branding';
import { getLegalDocument } from '../content/legalDocuments';

export const LEGAL_CONTACT_URL = 'https://github.com/Churma16/cost-per-day/issues';

function LegalDocumentPage({ documentKey }) {
  const { t, i18n } = useTranslation();
  const legalDocument = getLegalDocument(documentKey, i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    document.title = `${legalDocument.title} · ${PRODUCT_NAME}`;
  }, [legalDocument.title]);

  return (
    <main className="min-h-screen bg-[#F6F7F8] px-4 py-6 sm:py-10">
      <article className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[#E6E8EC] bg-white shadow-sm">
        <header className="border-b border-[#E6E8EC] bg-[#F9FAFA] px-5 py-6 sm:px-8 sm:py-8">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-[#2F7473] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473]"
          >
            <IoArrowBackOutline aria-hidden="true" className="text-lg" />
            {t('backToWorthwhile')}
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2F7473]">
            {PRODUCT_NAME} · {t('earlyBeta')}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {legalDocument.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#5F6873]">
            {legalDocument.summary}
          </p>
          <p className="mt-4 text-sm font-medium text-gray-500">
            {t('effectiveDate')}: {legalDocument.effectiveDate}
          </p>
        </header>

        <div className="space-y-8 px-5 py-7 sm:px-8 sm:py-9">
          {legalDocument.sections.map((section, sectionIndex) => {
            const headingId = `${documentKey}-section-${sectionIndex}`;

            return (
              <section key={section.heading} aria-labelledby={headingId}>
                <h2
                  id={headingId}
                  className="text-lg font-semibold tracking-tight text-gray-900"
                >
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3 text-[0.95rem] leading-7 text-[#4F5965]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets && (
                    <ul className="list-disc space-y-2 pl-5">
                      {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}

          <aside className="rounded-2xl border border-[#CFE1DF] bg-[#F1F7F6] p-4 text-sm leading-6 text-[#405654]">
            {t('legalQuestions')}{' '}
            <a
              href={LEGAL_CONTACT_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#2F7473] underline decoration-[#83AAA7] underline-offset-2"
            >
              {t('contactProjectOwner')}
            </a>
          </aside>
        </div>
      </article>
    </main>
  );
}

export default LegalDocumentPage;
