import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { post } from "@/utils/request";

/** Modal form generik untuk Top Up, Transfer, dan pembayaran layanan. */
export default function ActionModal({ config, onClose, onDone }) {
  const [values, setValues] = useState(config.initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    config.fields.forEach((f) => {
      const msg = f.validate?.(values[f.name]);
      if (msg) errs[f.name] = msg;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await post(config.endpoint, config.payload(values));
      toast.success(res.message);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={config.title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {config.fields.map((f) => (
          <div key={f.name}>
            <Input
              label={f.label}
              as={f.as}
              inputMode={f.inputMode}
              placeholder={f.placeholder}
              value={values[f.name]}
              error={errors[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: f.format ? f.format(e.target.value) : e.target.value }))}
            >
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Input>
            {f.hint && f.hint(values[f.name]) && !errors[f.name] && <p className="mt-1.5 text-sm font-bold text-primary-700">{f.hint(values[f.name])}</p>}
          </div>
        ))}
        <Button type="submit" loading={loading} className="w-full">{config.submitText}</Button>
      </form>
    </Modal>
  );
}
