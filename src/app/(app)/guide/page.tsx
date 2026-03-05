import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Guide</h1>
        <p className="text-sm text-muted-foreground">
          Everything you need to know about using ScriptFlow.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What is ScriptFlow?</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-invert prose-sm max-w-none space-y-3 text-sm text-muted-foreground">
          <p>
            ScriptFlow is a tool for translating YouTube scripts into multiple languages
            simultaneously and generating thumbnail variants using AI. It&apos;s designed
            to speed up the localization workflow for multi-language YouTube channels.
          </p>
          <p>
            The two main features are:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-foreground">Translate</strong> &mdash; Paste or upload scripts, pick target languages, and translate them all in parallel using xAI or OpenAI.</li>
            <li><strong className="text-foreground">Generate</strong> &mdash; Upload a thumbnail image and generate AI-modified variants using Google Gemini.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">1. Set Up API Keys</h3>
            <p>
              Before you can translate or generate, you need to configure at least one API key.
              Go to <strong className="text-foreground">Settings</strong> in the sidebar and enter your keys:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">xAI API Key</strong> &mdash; For translations using Grok.</li>
              <li><strong className="text-foreground">OpenAI API Key</strong> &mdash; For translations using GPT-4o.</li>
              <li><strong className="text-foreground">Google AI Studio API Key</strong> &mdash; For thumbnail generation using Gemini.</li>
            </ul>
            <p>
              You only need to set up the keys for the features you plan to use. For translations,
              choose your preferred provider (xAI or OpenAI) in the same settings page.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">2. Configure Languages</h3>
            <p>
              In <strong className="text-foreground">Settings</strong>, you can customize which languages are
              pre-selected on the translate page. You can also:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Add <strong className="text-foreground">custom languages</strong> that aren&apos;t in the built-in list (e.g., Swahili, Thai).</li>
              <li>Create <strong className="text-foreground">language presets</strong> &mdash; named groups of languages you can apply with one click on the translate page.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Translating Scripts */}
      <Card>
        <CardHeader>
          <CardTitle>Translating Scripts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Single Translation</h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Go to <strong className="text-foreground">Translate</strong> in the sidebar.</li>
              <li>Paste your script into the text area.</li>
              <li>Select target languages using checkboxes, or click a <strong className="text-foreground">preset button</strong> to select a saved group.</li>
              <li>Click <strong className="text-foreground">Translate</strong>. Translations run in parallel &mdash; you&apos;ll see real-time progress for each language.</li>
              <li>If some languages fail, use the <strong className="text-foreground">Retry Failed</strong> button to re-run only those.</li>
              <li>Click <strong className="text-foreground">View in Dashboard</strong> to see the results.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Batch Translation</h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Switch to the <strong className="text-foreground">Batch</strong> tab.</li>
              <li>Drag and drop <code>.txt</code> files (or click to browse).</li>
              <li>Select your target languages.</li>
              <li>Click <strong className="text-foreground">Translate All</strong>. Each file is processed in sequence, with all languages translated in parallel per file.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Translation Prompt</h3>
            <p>
              The AI uses a prompt template that you can customize in <strong className="text-foreground">Settings &gt; Prompt Templates</strong>.
              The placeholder <code className="rounded bg-muted px-1 py-0.5 text-xs">[TARGET LANGUAGE]</code> gets
              replaced with each language name. You can adjust this to change the AI&apos;s translation style,
              word count requirements, or other instructions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generating Thumbnails */}
      <Card>
        <CardHeader>
          <CardTitle>Generating Thumbnails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Go to <strong className="text-foreground">Generate</strong> in the sidebar.</li>
            <li>Upload a source thumbnail (drag & drop or click to browse). Accepts PNG, JPG, or WebP.</li>
            <li>Set the number of variants you want (1&ndash;10).</li>
            <li>Adjust the prompt if needed (default changes hair colour).</li>
            <li>Click <strong className="text-foreground">Generate</strong>. Each variant is created in parallel.</li>
            <li>Review the results &mdash; hover over a variant to download it individually.</li>
            <li>Click <strong className="text-foreground">Save All Variants</strong> to store them in the database.</li>
          </ol>
          <p>
            The generation prompt can be customized in <strong className="text-foreground">Settings &gt; Prompt Templates</strong>.
            This is the text sent to Google Gemini along with your image.
          </p>
        </CardContent>
      </Card>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Scripts</h3>
            <p>
              The <strong className="text-foreground">Scripts</strong> page shows all your translated scripts in a table.
              For each script you can:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Expand a row to see and copy each language&apos;s translation.</li>
              <li>Toggle which language columns are visible.</li>
              <li>Select scripts for bulk deletion.</li>
              <li>Click the copy icon to copy a translation to your clipboard.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Thumbnails</h3>
            <p>
              The <strong className="text-foreground">Thumbnails</strong> page (accessible from the sidebar) shows all
              your generated thumbnail sets. You can view the original alongside all variants,
              download individual images, or delete sets.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li>
              <strong className="text-foreground">API Keys</strong> &mdash; Store your xAI, OpenAI, and Google AI Studio keys. Keys are stored securely and never shared.
            </li>
            <li>
              <strong className="text-foreground">Preferred Provider</strong> &mdash; Choose between xAI (Grok) and OpenAI (GPT-4o) for script translations.
            </li>
            <li>
              <strong className="text-foreground">Custom Languages</strong> &mdash; Add any language not in the built-in list. The language name gets substituted into the translation prompt.
            </li>
            <li>
              <strong className="text-foreground">Language Presets</strong> &mdash; Create named groups of languages (e.g. &quot;Spanish Bundle&quot;, &quot;Asian Languages&quot;). On the translate page, click a preset to instantly select that group.
            </li>
            <li>
              <strong className="text-foreground">Language Defaults</strong> &mdash; Choose which languages are pre-checked by default when you open the translate page. Toggle &quot;Auto-fill&quot; on or off.
            </li>
            <li>
              <strong className="text-foreground">Prompt Templates</strong> &mdash; Customize the AI prompts for both translation and thumbnail generation. Use the reset button to go back to defaults.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Admin */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Users with the <strong className="text-foreground">Owner</strong> role have access to the
            Admin panel (visible in the sidebar). From there you can:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-foreground">View all content</strong> &mdash; See scripts and thumbnails from all users.</li>
            <li><strong className="text-foreground">User Management</strong> &mdash; Approve, ban, or unban users. Promote users to Owner or demote them. Reset passwords.</li>
          </ul>
          <p>
            New users who register are placed in a <strong className="text-foreground">Pending</strong> state
            and need to be approved by an Owner before they can access the app.
          </p>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>Use <strong className="text-foreground">language presets</strong> to save time &mdash; create one for each channel or project.</li>
            <li>The translation prompt includes a word count instruction by default. Adjust it if your translations are consistently too short or long.</li>
            <li>For batch translations, name your .txt files descriptively &mdash; the filename is saved alongside the script.</li>
            <li>The sidebar collapses to icons and expands on hover, giving you more space to work.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
